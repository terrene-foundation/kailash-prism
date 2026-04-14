import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/prism_colors.dart';
import '../theme/prism_spacing.dart';
import 'k_chat.dart';

/// KConversationSidebar + KChatState — Conversation management for KChatEngine.
///
/// Mirrors web `ConversationSidebar` + `useChatState` semantics:
///   - Date-grouped conversation list (Today / This Week / Earlier)
///   - Search filter on title + lastMessage
///   - Inline rename, delete with confirmation
///   - Collapsed mode (icon strip)
///   - metaBuilder slot for domain-specific badges
///   - KChatAdapter: transport-agnostic backend contract
///   - KChatState: ChangeNotifier managing conversations, messages, streaming
///
/// Spec: docs/specs/05-engine-specifications.md § 5.6 Conversation Management

// ============================================================================
// Types
// ============================================================================

/// Summary of a conversation for the sidebar list.
class KConversationSummary {
  final String id;
  final String title;
  final String? lastMessage;
  final DateTime timestamp;
  final int messageCount;

  const KConversationSummary({
    required this.id,
    required this.title,
    this.lastMessage,
    required this.timestamp,
    this.messageCount = 0,
  });

  KConversationSummary copyWith({String? title}) => KConversationSummary(
        id: id,
        title: title ?? this.title,
        lastMessage: lastMessage,
        timestamp: timestamp,
        messageCount: messageCount,
      );
}

/// Handle for an active streaming response.
abstract class KChatStreamHandle {
  void onToken(void Function(String token) callback);
  void onComplete(void Function(KChatMessage message) callback);
  void onError(void Function(Object error) callback);
  void abort();
}

/// Transport-agnostic adapter for chat backends.
///
/// Consumers implement this to connect to their SSE, WebSocket, REST, etc.
abstract class KChatAdapter {
  Future<List<KConversationSummary>> listConversations();
  Future<List<KChatMessage>> loadMessages(String conversationId);
  KChatStreamHandle sendMessage(
    String? conversationId,
    String content,
  );
  Future<void> deleteConversation(String id);
  Future<void> renameConversation(String id, String title);
}

// ============================================================================
// KChatState — ChangeNotifier for conversation state management
// ============================================================================

/// Manages conversations, messages, and streaming state.
///
/// Wrap with `ChangeNotifierProvider` or `ListenableBuilder` in consumer code.
/// Mirrors web `useChatState` hook semantics.
class KChatState extends ChangeNotifier {
  final KChatAdapter _adapter;

  List<KConversationSummary> _conversations = [];
  String? _activeConversationId;
  List<KChatMessage> _messages = [];
  bool _isStreaming = false;
  String _streamBuffer = '';
  bool _isLoadingConversations = false;
  bool _isLoadingMessages = false;
  Object? _error;

  KChatStreamHandle? _activeStream;

  KChatState(this._adapter);

  // --- Getters ---

  List<KConversationSummary> get conversations => _conversations;
  String? get activeConversationId => _activeConversationId;
  List<KChatMessage> get messages => _messages;
  bool get isStreaming => _isStreaming;
  String get streamBuffer => _streamBuffer;
  bool get isLoadingConversations => _isLoadingConversations;
  bool get isLoadingMessages => _isLoadingMessages;
  Object? get error => _error;

  // --- Actions ---

  /// Load the conversation list from the adapter.
  Future<void> loadConversations() async {
    _isLoadingConversations = true;
    notifyListeners();
    try {
      _conversations = await _adapter.listConversations();
      _error = null;
    } catch (e) {
      _error = e;
    } finally {
      _isLoadingConversations = false;
      notifyListeners();
    }
  }

  /// Switch to an existing conversation by ID.
  Future<void> switchConversation(String id) async {
    _abortStream();
    _activeConversationId = id;
    _isLoadingMessages = true;
    _messages = [];
    notifyListeners();

    try {
      _messages = await _adapter.loadMessages(id);
      _error = null;
    } catch (e) {
      _error = e;
    } finally {
      _isLoadingMessages = false;
      notifyListeners();
    }
  }

  /// Start a new conversation (clears active state).
  void startNewConversation() {
    _abortStream();
    _activeConversationId = null;
    _messages = [];
    notifyListeners();
  }

  /// Send a message in the active (or new) conversation.
  void sendMessage(String content) {
    if (content.trim().isEmpty) return;

    final trimmed = content.trim();

    // Add user message optimistically
    _messages = [
      ..._messages,
      KChatMessage(
        id: 'user-${DateTime.now().millisecondsSinceEpoch}',
        type: KMessageType.user,
        content: trimmed,
        timestamp: DateTime.now(),
        sender: KMessageSender.user,
      ),
    ];
    _isStreaming = true;
    _streamBuffer = '';
    _error = null;
    notifyListeners();

    final handle = _adapter.sendMessage(_activeConversationId, trimmed);
    _activeStream = handle;

    var buffer = '';

    handle.onToken((token) {
      buffer += token;
      _streamBuffer = buffer;
      notifyListeners();
    });

    handle.onComplete((msg) {
      _activeStream = null;
      _isStreaming = false;
      _streamBuffer = '';
      _messages = [..._messages, msg];
      notifyListeners();

      // Refresh conversations if this was a new conversation
      if (_activeConversationId == null) {
        loadConversations();
      }
    });

    handle.onError((err) {
      _activeStream = null;
      _isStreaming = false;
      _streamBuffer = '';
      _error = err;
      _messages = [
        ..._messages,
        KChatMessage(
          id: 'error-${DateTime.now().millisecondsSinceEpoch}',
          type: KMessageType.error,
          content: err.toString(),
          timestamp: DateTime.now(),
          sender: KMessageSender.system,
        ),
      ];
      notifyListeners();
    });
  }

  /// Stop the current stream.
  void stopStreaming() {
    if (_activeStream != null) {
      _activeStream!.abort();
      _activeStream = null;
    }
    if (_streamBuffer.isNotEmpty) {
      _messages = [
        ..._messages,
        KChatMessage(
          id: 'partial-${DateTime.now().millisecondsSinceEpoch}',
          type: KMessageType.assistant,
          content: _streamBuffer,
          timestamp: DateTime.now(),
          sender: KMessageSender.assistant,
        ),
      ];
    }
    _isStreaming = false;
    _streamBuffer = '';
    notifyListeners();
  }

  /// Delete a conversation.
  Future<void> deleteConversation(String id) async {
    await _adapter.deleteConversation(id);
    _conversations = _conversations.where((c) => c.id != id).toList();
    if (_activeConversationId == id) {
      _activeConversationId = null;
      _messages = [];
    }
    notifyListeners();
  }

  /// Rename a conversation.
  Future<void> renameConversation(String id, String title) async {
    await _adapter.renameConversation(id, title);
    _conversations = _conversations
        .map((c) => c.id == id ? c.copyWith(title: title) : c)
        .toList();
    notifyListeners();
  }

  void _abortStream() {
    if (_activeStream != null) {
      _activeStream!.abort();
      _activeStream = null;
    }
    _isStreaming = false;
    _streamBuffer = '';
  }

  @override
  void dispose() {
    _abortStream();
    super.dispose();
  }
}

// ============================================================================
// KConversationSidebar widget
// ============================================================================

/// Date group label used for conversation grouping.
enum _DateGroup { today, thisWeek, earlier }

_DateGroup _getDateGroup(DateTime timestamp) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final weekAgo = today.subtract(const Duration(days: 6));

  if (!timestamp.isBefore(today)) return _DateGroup.today;
  if (!timestamp.isBefore(weekAgo)) return _DateGroup.thisWeek;
  return _DateGroup.earlier;
}

String _dateGroupLabel(_DateGroup group) {
  switch (group) {
    case _DateGroup.today:
      return 'Today';
    case _DateGroup.thisWeek:
      return 'This Week';
    case _DateGroup.earlier:
      return 'Earlier';
  }
}

String _formatTimestamp(DateTime timestamp) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);

  if (!timestamp.isBefore(today)) {
    final h = timestamp.hour.toString().padLeft(2, '0');
    final m = timestamp.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return '${months[timestamp.month - 1]} ${timestamp.day}';
}

/// Conversation thread list sidebar.
///
/// Features: date grouping, search, inline rename, delete confirmation,
/// collapsed mode, metaBuilder slot for domain-specific badges.
class KConversationSidebar extends StatefulWidget {
  final List<KConversationSummary> conversations;
  final String? activeId;
  final ValueChanged<String> onSelect;
  final VoidCallback onNew;
  final ValueChanged<String>? onDelete;
  final void Function(String id, String title)? onRename;
  final bool deleteLoading;
  final bool renameLoading;
  final bool collapsed;
  final VoidCallback? onToggleCollapse;

  /// Build a custom widget for each conversation row (e.g. risk tier badge).
  final Widget Function(KConversationSummary)? metaBuilder;

  const KConversationSidebar({
    super.key,
    required this.conversations,
    required this.activeId,
    required this.onSelect,
    required this.onNew,
    this.onDelete,
    this.onRename,
    this.deleteLoading = false,
    this.renameLoading = false,
    this.collapsed = false,
    this.onToggleCollapse,
    this.metaBuilder,
  });

  @override
  State<KConversationSidebar> createState() => _KConversationSidebarState();
}

class _KConversationSidebarState extends State<KConversationSidebar> {
  String _searchQuery = '';
  String? _menuOpenId;
  String? _renamingId;
  String _renameValue = '';
  String? _confirmDeleteId;

  final _renameController = TextEditingController();
  final _renameFocus = FocusNode();
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _renameController.dispose();
    _renameFocus.dispose();
    _searchController.dispose();
    super.dispose();
  }

  List<KConversationSummary> get _filtered {
    if (_searchQuery.trim().isEmpty) return widget.conversations;
    final q = _searchQuery.toLowerCase();
    return widget.conversations.where((c) {
      return c.title.toLowerCase().contains(q) ||
          (c.lastMessage != null && c.lastMessage!.toLowerCase().contains(q));
    }).toList();
  }

  Map<_DateGroup, List<KConversationSummary>> get _grouped {
    final sorted = [..._filtered]
      ..sort((a, b) => b.timestamp.compareTo(a.timestamp));
    final groups = <_DateGroup, List<KConversationSummary>>{
      _DateGroup.today: [],
      _DateGroup.thisWeek: [],
      _DateGroup.earlier: [],
    };
    for (final c in sorted) {
      groups[_getDateGroup(c.timestamp)]!.add(c);
    }
    return groups;
  }

  void _startRename(KConversationSummary conv) {
    setState(() {
      _menuOpenId = null;
      _renamingId = conv.id;
      _renameValue = conv.title;
      _renameController.text = conv.title;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _renameFocus.requestFocus();
      _renameController.selection = TextSelection(
        baseOffset: 0,
        extentOffset: _renameController.text.length,
      );
    });
  }

  void _confirmRename() {
    if (_renamingId != null &&
        _renameValue.trim().isNotEmpty &&
        widget.onRename != null) {
      widget.onRename!(_renamingId!, _renameValue.trim());
    }
    setState(() {
      _renamingId = null;
      _renameValue = '';
    });
  }

  void _cancelRename() {
    setState(() {
      _renamingId = null;
      _renameValue = '';
    });
  }

  @override
  Widget build(BuildContext context) {
    if (widget.collapsed) {
      return _buildCollapsed();
    }
    return _buildFull();
  }

  Widget _buildCollapsed() {
    return SizedBox(
      width: 44,
      child: Column(
        children: [
          const SizedBox(height: PrismSpacing.md),
          _iconButton(
            icon: Icons.menu,
            tooltip: 'Expand conversation list',
            semanticLabel: 'Expand conversation list',
            onTap: widget.onToggleCollapse,
          ),
          const SizedBox(height: PrismSpacing.sm),
          _iconButton(
            icon: Icons.add,
            tooltip: 'New conversation',
            semanticLabel: 'New conversation',
            onTap: widget.onNew,
          ),
        ],
      ),
    );
  }

  Widget _iconButton({
    required IconData icon,
    required String tooltip,
    required String semanticLabel,
    VoidCallback? onTap,
  }) {
    return Semantics(
      label: semanticLabel,
      button: true,
      child: Tooltip(
        message: tooltip,
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: onTap,
          child: Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: PrismColors.borderDefault),
            ),
            child: Icon(icon, size: 18, color: PrismColors.textSecondary),
          ),
        ),
      ),
    );
  }

  Widget _buildFull() {
    return Column(
      children: [
        // Header
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
          child: Row(
            children: [
              const Expanded(
                child: Text(
                  'Conversations',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: PrismColors.textPrimary,
                  ),
                ),
              ),
              _HeaderButton(label: '+ New', onTap: widget.onNew),
              if (widget.onToggleCollapse != null) ...[
                const SizedBox(width: 4),
                _HeaderButton(
                  label: '◀',
                  onTap: widget.onToggleCollapse!,
                  semanticLabel: 'Collapse conversation list',
                ),
              ],
            ],
          ),
        ),

        // Search
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
          child: TextField(
            controller: _searchController,
            onChanged: (v) => setState(() => _searchQuery = v),
            decoration: InputDecoration(
              hintText: 'Search conversations...',
              hintStyle: const TextStyle(fontSize: 13, color: PrismColors.textSecondary),
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(6),
                borderSide: const BorderSide(color: PrismColors.borderDefault),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(6),
                borderSide: const BorderSide(color: PrismColors.borderDefault),
              ),
              filled: true,
              fillColor: PrismColors.surfacePage,
            ),
            style: const TextStyle(fontSize: 13),
          ),
        ),

        // List
        Expanded(
          child: _buildList(),
        ),
      ],
    );
  }

  Widget _buildList() {
    final filtered = _filtered;
    if (filtered.isEmpty) {
      return Center(
        child: Text(
          _searchQuery.isNotEmpty
              ? 'No matching conversations'
              : 'No conversations yet',
          style: const TextStyle(
            fontSize: 13,
            color: PrismColors.textSecondary,
          ),
        ),
      );
    }

    final grouped = _grouped;
    final children = <Widget>[];

    for (final group in _DateGroup.values) {
      final items = grouped[group]!;
      if (items.isEmpty) continue;

      children.add(Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
        child: Text(
          _dateGroupLabel(group),
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.5,
            color: PrismColors.textSecondary,
          ),
        ),
      ));

      for (final conv in items) {
        children.add(_buildConversationItem(conv));
      }
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
      children: children,
    );
  }

  Widget _buildConversationItem(KConversationSummary conv) {
    final isActive = conv.id == widget.activeId;
    final isRenaming = conv.id == _renamingId;
    final isConfirmingDelete = conv.id == _confirmDeleteId;

    return GestureDetector(
      onTap: isRenaming ? null : () => widget.onSelect(conv.id),
      child: Container(
        margin: const EdgeInsets.only(bottom: 2),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? PrismColors.surfaceActive : null,
          borderRadius: BorderRadius.circular(6),
          border: isActive
              ? const Border(
                  left: BorderSide(color: PrismColors.primary, width: 3),
                )
              : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Title or rename input
            if (isRenaming)
              _buildRenameInput()
            else
              Row(
                children: [
                  Expanded(
                    child: Text(
                      conv.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: PrismColors.textPrimary,
                      ),
                    ),
                  ),
                  if (!isConfirmingDelete &&
                      (widget.onDelete != null || widget.onRename != null))
                    _buildMenuButton(conv),
                ],
              ),

            // Preview
            if (!isRenaming && conv.lastMessage != null)
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Text(
                  conv.lastMessage!.length > 80
                      ? '${conv.lastMessage!.substring(0, 80)}...'
                      : conv.lastMessage!,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 12,
                    color: PrismColors.textSecondary,
                  ),
                ),
              ),

            // Meta row
            if (!isRenaming)
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Row(
                  children: [
                    Text(
                      _formatTimestamp(conv.timestamp),
                      style: const TextStyle(
                        fontSize: 11,
                        color: PrismColors.textTertiary,
                      ),
                    ),
                    if (widget.metaBuilder != null) ...[
                      const Spacer(),
                      widget.metaBuilder!(conv),
                    ],
                  ],
                ),
              ),

            // Delete confirmation
            if (isConfirmingDelete) _buildDeleteConfirmation(conv.id),

            // Dropdown menu
            if (_menuOpenId == conv.id && !isRenaming && !isConfirmingDelete)
              _buildMenu(conv),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuButton(KConversationSummary conv) {
    return Semantics(
      label: 'Actions for ${conv.title}',
      button: true,
      child: GestureDetector(
        onTap: () {
          setState(() {
            _menuOpenId = _menuOpenId == conv.id ? null : conv.id;
          });
        },
        child: const Padding(
          padding: EdgeInsets.all(4),
          child: Icon(Icons.more_vert, size: 16, color: PrismColors.textSecondary),
        ),
      ),
    );
  }

  Widget _buildMenu(KConversationSummary conv) {
    return Container(
      margin: const EdgeInsets.only(top: 4),
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: PrismColors.surfaceCard,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: PrismColors.borderDefault),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 8)],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (widget.onRename != null)
            _MenuItem(
              label: 'Rename',
              onTap: () => _startRename(conv),
            ),
          if (widget.onDelete != null)
            _MenuItem(
              label: 'Delete',
              isDestructive: true,
              onTap: () {
                setState(() {
                  _menuOpenId = null;
                  _confirmDeleteId = conv.id;
                });
              },
            ),
        ],
      ),
    );
  }

  Widget _buildRenameInput() {
    return CallbackShortcuts(
      bindings: {
        const SingleActivator(LogicalKeyboardKey.escape): _cancelRename,
      },
      child: TextField(
        controller: _renameController,
        focusNode: _renameFocus,
        onChanged: (v) => _renameValue = v,
        onSubmitted: (_) => _confirmRename(),
        enabled: !widget.renameLoading,
        decoration: InputDecoration(
          isDense: true,
          contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(4),
            borderSide: const BorderSide(color: PrismColors.primary),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(4),
            borderSide: const BorderSide(color: PrismColors.primary, width: 2),
          ),
        ),
        style: const TextStyle(fontSize: 14),
        onTapOutside: (_) => _confirmRename(),
      ),
    );
  }

  Widget _buildDeleteConfirmation(String id) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        children: [
          const Text(
            'Delete?',
            style: TextStyle(fontSize: 12, color: PrismColors.statusError),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: widget.deleteLoading
                ? null
                : () {
                    widget.onDelete?.call(id);
                    setState(() => _confirmDeleteId = null);
                  },
            child: Text(
              widget.deleteLoading ? '...' : 'Yes',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: PrismColors.statusError,
              ),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () => setState(() => _confirmDeleteId = null),
            child: const Text(
              'No',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// Private helper widgets
// ============================================================================

class _HeaderButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  final String? semanticLabel;

  const _HeaderButton({
    required this.label,
    required this.onTap,
    this.semanticLabel,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: semanticLabel ?? label,
      button: true,
      child: InkWell(
        borderRadius: BorderRadius.circular(6),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(6),
            border: Border.all(color: PrismColors.borderDefault),
            color: PrismColors.surfacePage,
          ),
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: PrismColors.textPrimary,
            ),
          ),
        ),
      ),
    );
  }
}

class _MenuItem extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  final bool isDestructive;

  const _MenuItem({
    required this.label,
    required this.onTap,
    this.isDestructive = false,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(4),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            color: isDestructive
                ? PrismColors.statusError
                : PrismColors.textPrimary,
          ),
        ),
      ),
    );
  }
}
