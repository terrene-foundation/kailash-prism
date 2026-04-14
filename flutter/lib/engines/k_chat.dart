import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/prism_colors.dart';
import '../theme/prism_spacing.dart';

/// KChatEngine — AI chat engine for Kailash Kaizen agent applications.
///
/// Mirrors web `ChatEngine` semantics:
///  - 7 message types (user/assistant/streaming/system/tool-call/tool-result/error)
///  - Streaming assistant messages with cursor
///  - Stream-of-thought (tool call step list)
///  - Action plan (approve/modify/reject per step)
///  - Suggestion chips (empty state + post-response)
///  - Auto-scroll on new messages
///  - Cmd/Ctrl+Enter to send
///
/// Spec: docs/specs/05-engine-specifications.md § 5.6

// ============================================================================
// Types
// ============================================================================

enum KMessageType {
  user,
  assistant,
  assistantStreaming,
  system,
  toolCall,
  toolResult,
  error,
}

enum KMessageSender { user, assistant, system }

enum KToolCallStatus { queued, running, done, error }

class KCitation {
  final int index;
  final String source;
  final String excerpt;
  final double? confidence;
  final int? page;

  const KCitation({
    required this.index,
    required this.source,
    required this.excerpt,
    this.confidence,
    this.page,
  });
}

class KToolCallData {
  final String name;
  final Map<String, Object?> parameters;
  final KToolCallStatus status;

  /// Tool call duration in milliseconds. Matches web `duration` field on
  /// `ToolCallData` in `web/src/engines/ai-chat/types.ts`.
  final int? duration;

  const KToolCallData({
    required this.name,
    required this.parameters,
    required this.status,
    this.duration,
  });
}

class KToolResultData {
  final String summary;
  final Object? data;
  final bool success;

  const KToolResultData({
    required this.summary,
    required this.data,
    required this.success,
  });
}

class KChatMessage {
  final String id;
  final KMessageType type;
  final String content;
  final DateTime timestamp;
  final KMessageSender sender;
  final List<KCitation>? citations;
  final KToolCallData? toolCall;
  final KToolResultData? toolResult;
  final String? parentId;
  final int? branchIndex;

  /// Domain-specific metadata (e.g. risk tier, confidence score).
  final Map<String, Object?>? meta;

  const KChatMessage({
    required this.id,
    required this.type,
    required this.content,
    required this.timestamp,
    required this.sender,
    this.citations,
    this.toolCall,
    this.toolResult,
    this.parentId,
    this.branchIndex,
    this.meta,
  });
}

enum KActionPlanAction { approve, modify, reject }

enum KActionPlanStepStatus { pending, approved, modified, rejected }

class KActionPlanStep {
  final int index;
  final String description;
  final KActionPlanStepStatus status;
  final String? modification;

  const KActionPlanStep({
    required this.index,
    required this.description,
    this.status = KActionPlanStepStatus.pending,
    this.modification,
  });
}

class KActionPlanResponse {
  final int stepIndex;
  final KActionPlanAction action;
  final String? modification;

  const KActionPlanResponse({
    required this.stepIndex,
    required this.action,
    this.modification,
  });
}

class KToolCallStep {
  final String id;
  final String name;
  final KToolCallStatus status;

  /// Step duration in milliseconds. Matches web `duration` field on
  /// `ToolCallStep` in `web/src/engines/ai-chat/types.ts`.
  final int? duration;
  final String? summary;

  const KToolCallStep({
    required this.id,
    required this.name,
    required this.status,
    this.duration,
    this.summary,
  });
}

class KSuggestionChip {
  final String label;
  final String value;
  final IconData? icon;

  const KSuggestionChip({required this.label, required this.value, this.icon});
}

class KChatFeatures {
  final bool citations;
  final bool toolCalls;
  final bool actionPlans;
  final bool suggestions;

  const KChatFeatures({
    this.citations = true,
    this.toolCalls = true,
    this.actionPlans = true,
    this.suggestions = true,
  });
}

class KChatInputConfig {
  final String placeholder;
  final int? maxLength;
  final bool disabled;

  const KChatInputConfig({
    this.placeholder = 'Type a message...',
    this.maxLength,
    this.disabled = false,
  });
}

/// Event fired when the user sends a chat message.
///
/// The `attachments` field is reserved for future file-attachment support.
/// Phase 1 does not ship a file picker — attachment UX requires a platform
/// channel (e.g. `file_picker` package) that will be added in Phase 2. See
/// journal 0019-GAP-flutter-chat-attachments-deferred.md.
class KChatSendEvent {
  final String content;
  final List<String>? attachments;

  const KChatSendEvent({required this.content, this.attachments});
}

// ============================================================================
// KChatEngine — root widget
// ============================================================================

class KChatEngine extends StatefulWidget {
  final List<KChatMessage> messages;
  final bool isStreaming;
  final String? streamBuffer;
  final List<KToolCallStep> toolCallSteps;
  final List<KActionPlanStep>? actionPlan;
  final List<KSuggestionChip> suggestions;
  final KChatInputConfig input;
  final KChatFeatures features;
  final Widget? userAvatar;
  final Widget? assistantAvatar;
  final void Function(KChatSendEvent event)? onSend;
  final void Function(KActionPlanResponse response)? onActionPlanResponse;
  final void Function(KCitation citation)? onCitationClick;
  final void Function(KSuggestionChip suggestion)? onSuggestionClick;
  final void Function(String messageId)? onRetry;
  final String? ariaLabel;

  const KChatEngine({
    super.key,
    required this.messages,
    this.isStreaming = false,
    this.streamBuffer,
    this.toolCallSteps = const [],
    this.actionPlan,
    this.suggestions = const [],
    this.input = const KChatInputConfig(),
    this.features = const KChatFeatures(),
    this.userAvatar,
    this.assistantAvatar,
    this.onSend,
    this.onActionPlanResponse,
    this.onCitationClick,
    this.onSuggestionClick,
    this.onRetry,
    this.ariaLabel,
  });

  @override
  State<KChatEngine> createState() => _KChatEngineState();
}

class _KChatEngineState extends State<KChatEngine> {
  final _scrollController = ScrollController();
  final _inputController = TextEditingController();

  @override
  void didUpdateWidget(KChatEngine oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Auto-scroll to bottom on new messages or stream buffer change.
    if (oldWidget.messages.length != widget.messages.length ||
        oldWidget.streamBuffer != widget.streamBuffer) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        // Guard against the widget being torn down between this frame and
        // the next — without it, a mid-stream unmount throws
        // `ScrollController used after dispose`.
        if (!mounted) return;
        if (_scrollController.hasClients) {
          _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
        }
      });
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _inputController.dispose();
    super.dispose();
  }

  void _handleSend() {
    final text = _inputController.text.trim();
    if (text.isEmpty) return;
    widget.onSend?.call(KChatSendEvent(content: text));
    _inputController.clear();
    setState(() {});
  }

  void _handleSuggestionTap(KSuggestionChip chip) {
    if (widget.onSuggestionClick != null) {
      widget.onSuggestionClick!(chip);
    } else {
      _inputController.text = chip.value;
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEmpty = widget.messages.isEmpty;

    return Semantics(
      label: widget.ariaLabel ?? 'Chat conversation',
      container: true,
      child: Container(
        color: PrismColors.surfacePage,
        child: Column(
          children: [
            // Message list (or empty state).
            //
            // `liveRegion: true` is scoped to the message list only so the
            // chat's input (TextField) does not re-announce on every
            // keystroke. Web does the same via `aria-live="polite"` on
            // the log element, not the container.
            Expanded(
              child: Semantics(
                liveRegion: true,
                container: true,
                child: isEmpty
                    ? _EmptyState(
                        suggestions:
                            widget.features.suggestions ? widget.suggestions : const [],
                        onSelect: _handleSuggestionTap,
                      )
                    : _buildMessageList(),
              ),
            ),

            // Inline suggestions between messages and input
            if (!isEmpty &&
                widget.features.suggestions &&
                widget.suggestions.isNotEmpty &&
                !widget.isStreaming)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: PrismSpacing.lg),
                child: _KSuggestionChipsRow(
                  suggestions: widget.suggestions,
                  onSelect: _handleSuggestionTap,
                ),
              ),

            // Input
            _KChatInput(
              controller: _inputController,
              onSend: _handleSend,
              placeholder: widget.input.placeholder,
              disabled: widget.input.disabled || widget.isStreaming,
              maxLength: widget.input.maxLength,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessageList() {
    final visible = widget.messages.where((m) {
      if (!widget.features.toolCalls &&
          (m.type == KMessageType.toolCall || m.type == KMessageType.toolResult)) {
        return false;
      }
      return true;
    }).toList();

    // Build the display list, including streaming, tool-call steps, action plan
    final bubbles = <Widget>[
      for (final msg in visible)
        Padding(
          padding: const EdgeInsets.only(bottom: PrismSpacing.lg),
          child: _KChatMessageBubble(
            message: msg,
            avatar: msg.sender == KMessageSender.user
                ? widget.userAvatar
                : msg.sender == KMessageSender.assistant
                    ? widget.assistantAvatar
                    : null,
            onCitationClick: widget.features.citations ? widget.onCitationClick : null,
            onRetry: widget.onRetry,
          ),
        ),
      if (widget.isStreaming && widget.streamBuffer != null && widget.streamBuffer!.isNotEmpty)
        Padding(
          padding: const EdgeInsets.only(bottom: PrismSpacing.lg),
          child: _KChatMessageBubble(
            message: KChatMessage(
              id: '__streaming__',
              type: KMessageType.assistantStreaming,
              content: widget.streamBuffer!,
              timestamp: DateTime.now(),
              sender: KMessageSender.assistant,
            ),
            streaming: true,
            avatar: widget.assistantAvatar,
            onCitationClick: widget.features.citations ? widget.onCitationClick : null,
          ),
        ),
      if (widget.features.toolCalls && widget.toolCallSteps.isNotEmpty)
        Padding(
          padding: const EdgeInsets.only(bottom: PrismSpacing.lg),
          child: KStreamOfThought(steps: widget.toolCallSteps),
        ),
      if (widget.features.actionPlans &&
          widget.actionPlan != null &&
          widget.actionPlan!.isNotEmpty &&
          widget.onActionPlanResponse != null)
        Padding(
          padding: const EdgeInsets.only(bottom: PrismSpacing.lg),
          child: KActionPlan(
            steps: widget.actionPlan!,
            onResponse: widget.onActionPlanResponse!,
          ),
        ),
    ];

    return ListView(
      controller: _scrollController,
      padding: const EdgeInsets.fromLTRB(
        PrismSpacing.lg,
        PrismSpacing.lg,
        PrismSpacing.lg,
        PrismSpacing.sm,
      ),
      children: bubbles,
    );
  }
}

// ============================================================================
// Empty state
// ============================================================================

class _EmptyState extends StatelessWidget {
  final List<KSuggestionChip> suggestions;
  final void Function(KSuggestionChip) onSelect;

  const _EmptyState({required this.suggestions, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(PrismSpacing.xxl),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.chat_bubble_outline, size: 40, color: PrismColors.textSecondary),
          const SizedBox(height: PrismSpacing.lg),
          const Text(
            'Start a conversation',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w500,
              color: PrismColors.textPrimary,
            ),
          ),
          const SizedBox(height: PrismSpacing.sm),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400),
            child: const Text(
              'Type a message below or choose a suggestion to get started.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: PrismColors.textSecondary),
            ),
          ),
          if (suggestions.isNotEmpty) ...[
            const SizedBox(height: PrismSpacing.lg),
            _KSuggestionChipsRow(suggestions: suggestions, onSelect: onSelect),
          ],
        ],
      ),
    );
  }
}

// ============================================================================
// Message bubble
// ============================================================================

class _KChatMessageBubble extends StatefulWidget {
  final KChatMessage message;
  final bool streaming;
  final Widget? avatar;
  final void Function(KCitation)? onCitationClick;
  final void Function(String)? onRetry;

  const _KChatMessageBubble({
    required this.message,
    this.streaming = false,
    this.avatar,
    this.onCitationClick,
    this.onRetry,
  });

  @override
  State<_KChatMessageBubble> createState() => _KChatMessageBubbleState();
}

class _KChatMessageBubbleState extends State<_KChatMessageBubble> {
  bool _citationsExpanded = false;

  String _formatTimestamp(DateTime ts) {
    final h = ts.hour.toString().padLeft(2, '0');
    final m = ts.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  @override
  Widget build(BuildContext context) {
    final msg = widget.message;
    final isUser = msg.sender == KMessageSender.user;
    final isAssistant = msg.sender == KMessageSender.assistant;
    final timestamp = _formatTimestamp(msg.timestamp);

    // System messages — centered, muted
    if (msg.type == KMessageType.system) {
      return Semantics(
        label: 'System message',
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Center(
            child: Text(
              msg.content,
              style: const TextStyle(fontSize: 12, color: PrismColors.textDisabled),
            ),
          ),
        ),
      );
    }

    // Tool-call / tool-result — inline cards
    if (msg.type == KMessageType.toolCall) {
      return _ToolCallCard(toolCall: msg.toolCall);
    }
    if (msg.type == KMessageType.toolResult) {
      return _ToolResultCard(toolResult: msg.toolResult);
    }

    // Error — bordered alert with retry
    if (msg.type == KMessageType.error) {
      return Semantics(
        label: 'Error message',
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFFEF2F2),
            border: Border.all(color: PrismColors.statusError),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Error',
                style: TextStyle(
                  fontWeight: FontWeight.w500,
                  color: PrismColors.statusError,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                msg.content,
                style: const TextStyle(color: PrismColors.statusError),
              ),
              if (widget.onRetry != null) ...[
                const SizedBox(height: 8),
                OutlinedButton(
                  onPressed: () => widget.onRetry!(msg.id),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: PrismColors.statusError),
                    foregroundColor: PrismColors.statusError,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  ),
                  child: const Text('Retry'),
                ),
              ],
            ],
          ),
        ),
      );
    }

    // User / assistant / streaming bubble
    final bubbleColor = isUser ? PrismColors.interactivePrimary : PrismColors.surfaceElevated;
    final textColor = isUser ? PrismColors.textOnPrimary : PrismColors.textPrimary;
    final defaultAvatar = _DefaultAvatar(isUser: isUser);
    final crossAxis = isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start;

    final children = <Widget>[
      widget.avatar ?? defaultAvatar,
      const SizedBox(width: 8),
      Flexible(
        child: Column(
          crossAxisAlignment: crossAxis,
          children: [
            ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.8,
              ),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: bubbleColor,
                  borderRadius: BorderRadius.only(
                    topLeft: const Radius.circular(12),
                    topRight: const Radius.circular(12),
                    bottomLeft: Radius.circular(isUser ? 12 : 2),
                    bottomRight: Radius.circular(isUser ? 2 : 12),
                  ),
                ),
                child: _MessageContent(
                  text: msg.content,
                  color: textColor,
                  streaming: widget.streaming,
                ),
              ),
            ),
            if (isAssistant && msg.citations != null && msg.citations!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: _CitationList(
                  citations: msg.citations!,
                  expanded: _citationsExpanded,
                  onToggle: () => setState(() => _citationsExpanded = !_citationsExpanded),
                  onCitationClick: widget.onCitationClick,
                ),
              ),
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                timestamp,
                style: const TextStyle(fontSize: 11, color: PrismColors.textDisabled),
              ),
            ),
          ],
        ),
      ),
    ];

    return Semantics(
      label: '${isUser ? "user" : "assistant"} message at $timestamp',
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        textDirection: isUser ? TextDirection.rtl : TextDirection.ltr,
        children: children.map((w) {
          // Preserve original text direction inside each child
          return Directionality(textDirection: TextDirection.ltr, child: w);
        }).toList(),
      ),
    );
  }
}

class _MessageContent extends StatelessWidget {
  final String text;
  final Color color;
  final bool streaming;

  const _MessageContent({required this.text, required this.color, required this.streaming});

  @override
  Widget build(BuildContext context) {
    if (!streaming) {
      return Text(text, style: TextStyle(color: color, fontSize: 14, height: 1.5));
    }
    // Streaming: text + blinking cursor (we use a simple opacity animation)
    return _StreamingText(text: text, color: color);
  }
}

class _StreamingText extends StatefulWidget {
  final String text;
  final Color color;

  const _StreamingText({required this.text, required this.color});

  @override
  State<_StreamingText> createState() => _StreamingTextState();
}

class _StreamingTextState extends State<_StreamingText> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1060),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Honor OS-level reduced-motion / disable-animations preferences
    // (WCAG 2.3.3 / 2.2.2). If the OS disables animations we show a
    // static cursor instead of blinking.
    final disableAnimations = MediaQuery.of(context).disableAnimations;
    if (disableAnimations) {
      if (_controller.isAnimating) _controller.stop();
    } else if (!_controller.isAnimating) {
      _controller.repeat(reverse: true);
    }

    // The cursor is decorative — `ExcludeSemantics` keeps screen readers
    // from re-announcing it on every frame while the message list is in
    // its live region.
    final cursor = ExcludeSemantics(
      child: FadeTransition(
        opacity: _controller,
        child: Container(
          width: 2,
          height: 14,
          margin: const EdgeInsets.only(left: 2, bottom: 2),
          color: widget.color,
        ),
      ),
    );

    // Row with a plain Text + animated cursor so `find.text(...)` works.
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      mainAxisSize: MainAxisSize.min,
      children: [
        Flexible(
          child: Text(
            widget.text,
            style: TextStyle(color: widget.color, fontSize: 14, height: 1.5),
          ),
        ),
        cursor,
      ],
    );
  }
}

class _DefaultAvatar extends StatelessWidget {
  final bool isUser;

  const _DefaultAvatar({required this.isUser});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 32,
      height: 32,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: isUser ? PrismColors.interactivePrimary : PrismColors.surfaceElevated,
        shape: BoxShape.circle,
      ),
      child: Text(
        isUser ? 'U' : 'AI',
        style: TextStyle(
          color: isUser ? PrismColors.textOnPrimary : PrismColors.textPrimary,
          fontSize: 13,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

// ============================================================================
// Citations
// ============================================================================

class _CitationList extends StatelessWidget {
  final List<KCitation> citations;
  final bool expanded;
  final VoidCallback onToggle;
  final void Function(KCitation)? onCitationClick;

  const _CitationList({
    required this.citations,
    required this.expanded,
    required this.onToggle,
    required this.onCitationClick,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        InkWell(
          onTap: onToggle,
          child: Semantics(
            button: true,
            label: expanded ? 'Hide sources' : 'Show sources',
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  expanded ? Icons.arrow_drop_down : Icons.arrow_right,
                  size: 16,
                  color: PrismColors.interactivePrimary,
                ),
                Text(
                  '${citations.length} source${citations.length == 1 ? "" : "s"}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: PrismColors.interactivePrimary,
                  ),
                ),
              ],
            ),
          ),
        ),
        if (expanded)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final cit in citations)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: InkWell(
                      onTap: onCitationClick == null ? null : () => onCitationClick!(cit),
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: PrismColors.surfaceCard,
                          border: Border.all(color: PrismColors.borderDefault),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            SizedBox(
                              width: 24,
                              child: Text(
                                '[${cit.index}]',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: PrismColors.interactivePrimary,
                                ),
                              ),
                            ),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    cit.source,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500,
                                      color: PrismColors.textPrimary,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    cit.excerpt,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: PrismColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            if (cit.confidence != null)
                              Container(
                                margin: const EdgeInsets.only(left: 8),
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: cit.confidence! > 0.8
                                      ? const Color(0xFFF0FDF4)
                                      : PrismColors.surfaceElevated,
                                  borderRadius: BorderRadius.circular(PrismRadius.pill),
                                ),
                                child: Text(
                                  '${(cit.confidence! * 100).round()}%',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: cit.confidence! > 0.8
                                        ? PrismColors.statusSuccess
                                        : PrismColors.textSecondary,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}

// ============================================================================
// Tool call / result inline cards
// ============================================================================

class _ToolCallCard extends StatefulWidget {
  final KToolCallData? toolCall;

  const _ToolCallCard({required this.toolCall});

  @override
  State<_ToolCallCard> createState() => _ToolCallCardState();
}

class _ToolCallCardState extends State<_ToolCallCard> {
  bool _expanded = false;

  String _statusIcon(KToolCallStatus s) {
    switch (s) {
      case KToolCallStatus.done:
        return '✓';
      case KToolCallStatus.running:
        return '⟳';
      case KToolCallStatus.error:
        return '✗';
      case KToolCallStatus.queued:
        return '○';
    }
  }

  Color _statusColor(KToolCallStatus s) {
    switch (s) {
      case KToolCallStatus.done:
        return PrismColors.statusSuccess;
      case KToolCallStatus.error:
        return PrismColors.statusError;
      case KToolCallStatus.running:
        return PrismColors.interactivePrimary;
      case KToolCallStatus.queued:
        return PrismColors.textSecondary;
    }
  }

  String _formatDuration(int? ms) {
    if (ms == null) return '';
    if (ms < 1000) return '${ms}ms';
    return '${(ms / 1000).toStringAsFixed(1)}s';
  }

  @override
  Widget build(BuildContext context) {
    final tool = widget.toolCall;
    if (tool == null) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: PrismColors.surfaceCard,
        border: Border.all(color: PrismColors.borderDefault),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: () => setState(() => _expanded = !_expanded),
            child: Row(
              children: [
                Text(
                  _statusIcon(tool.status),
                  style: TextStyle(color: _statusColor(tool.status), fontWeight: FontWeight.w600),
                ),
                const SizedBox(width: 8),
                Text(
                  tool.name,
                  style: const TextStyle(
                    fontWeight: FontWeight.w500,
                    fontFamily: 'monospace',
                    fontSize: 13,
                  ),
                ),
                const Spacer(),
                if (tool.duration != null)
                  Text(
                    _formatDuration(tool.duration),
                    style: const TextStyle(fontSize: 11, color: PrismColors.textSecondary),
                  ),
              ],
            ),
          ),
          if (_expanded)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: PrismColors.gray50,
                  borderRadius: BorderRadius.circular(4),
                ),
                // Encode nested objects via JSON with 2-space indent to match
                // web `JSON.stringify(tool.parameters, null, 2)` behavior.
                // `e.value.toString()` collapses Maps/Lists to unreadable
                // `{k: Instance of 'Foo'}` output for structured args.
                child: Text(
                  _prettyJson(tool.parameters),
                  style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Encode a Dart value as a pretty-printed JSON string. Falls back to
/// `toString()` for objects not directly encodable by `jsonEncode` (e.g.
/// a `DateTime` or a custom class), matching web's behavior where
/// `JSON.stringify` emits a string for any non-object.
String _prettyJson(Object? value) {
  try {
    return const JsonEncoder.withIndent('  ').convert(value);
  } catch (_) {
    return value?.toString() ?? '';
  }
}

class _ToolResultCard extends StatefulWidget {
  final KToolResultData? toolResult;

  const _ToolResultCard({required this.toolResult});

  @override
  State<_ToolResultCard> createState() => _ToolResultCardState();
}

class _ToolResultCardState extends State<_ToolResultCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final result = widget.toolResult;
    if (result == null) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: PrismColors.surfaceCard,
        border: Border.all(color: PrismColors.borderDefault),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: () => setState(() => _expanded = !_expanded),
            child: Row(
              children: [
                Text(
                  result.success ? '✓' : '✗',
                  style: TextStyle(
                    color: result.success ? PrismColors.statusSuccess : PrismColors.statusError,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    result.summary,
                    style: const TextStyle(fontFamily: 'monospace', fontSize: 13),
                  ),
                ),
              ],
            ),
          ),
          if (_expanded)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: PrismColors.gray50,
                  borderRadius: BorderRadius.circular(4),
                ),
                // Match web `chat-message.tsx:293`: strings render as-is,
                // everything else is JSON-encoded with 2-space indent.
                child: Text(
                  result.data is String
                      ? result.data as String
                      : _prettyJson(result.data),
                  style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ============================================================================
// KStreamOfThought — tool call step list
// ============================================================================

class KStreamOfThought extends StatelessWidget {
  final List<KToolCallStep> steps;

  const KStreamOfThought({super.key, required this.steps});

  String _icon(KToolCallStatus s) {
    switch (s) {
      case KToolCallStatus.done:
        return '✓';
      case KToolCallStatus.running:
        return '⟳';
      case KToolCallStatus.error:
        return '✗';
      case KToolCallStatus.queued:
        return '○';
    }
  }

  Color _color(KToolCallStatus s) {
    switch (s) {
      case KToolCallStatus.done:
        return PrismColors.statusSuccess;
      case KToolCallStatus.running:
        return PrismColors.interactivePrimary;
      case KToolCallStatus.error:
        return PrismColors.statusError;
      case KToolCallStatus.queued:
        return PrismColors.textDisabled;
    }
  }

  String _formatDuration(int? ms) {
    if (ms == null) return '';
    if (ms < 1000) return '${ms}ms';
    return '${(ms / 1000).toStringAsFixed(1)}s';
  }

  @override
  Widget build(BuildContext context) {
    if (steps.isEmpty) return const SizedBox.shrink();

    return Semantics(
      label: 'Tool execution progress',
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: PrismColors.surfaceCard,
          border: Border.all(color: PrismColors.borderDefault),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (final step in steps)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 3),
                child: Row(
                  children: [
                    SizedBox(
                      width: 16,
                      child: Text(
                        _icon(step.status),
                        style: TextStyle(
                          color: _color(step.status),
                          fontWeight: FontWeight.w600,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        step.summary ?? step.name,
                        style: TextStyle(
                          fontSize: 13,
                          color: step.status == KToolCallStatus.queued
                              ? PrismColors.textDisabled
                              : PrismColors.textPrimary,
                        ),
                      ),
                    ),
                    SizedBox(
                      width: 48,
                      child: Text(
                        step.status == KToolCallStatus.running
                            ? '...'
                            : _formatDuration(step.duration),
                        style: const TextStyle(fontSize: 11, color: PrismColors.textSecondary),
                        textAlign: TextAlign.right,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// KActionPlan — approve/modify/reject per step
// ============================================================================

class KActionPlan extends StatefulWidget {
  final List<KActionPlanStep> steps;
  final void Function(KActionPlanResponse) onResponse;

  const KActionPlan({super.key, required this.steps, required this.onResponse});

  @override
  State<KActionPlan> createState() => _KActionPlanState();
}

class _KActionPlanState extends State<KActionPlan> {
  int? _editingStep;
  final _editController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Drive the Save button's enabled state off the live text. Without the
    // listener the disabled check evaluated at build() becomes stale the
    // moment the user types — Save stayed disabled even after input.
    _editController.addListener(_onEditChanged);
  }

  @override
  void dispose() {
    _editController.removeListener(_onEditChanged);
    _editController.dispose();
    super.dispose();
  }

  void _onEditChanged() {
    if (!mounted) return;
    setState(() {});
  }

  void _startModify(int stepIndex) {
    setState(() {
      _editingStep = stepIndex;
      _editController.clear();
    });
  }

  void _cancelModify() {
    setState(() {
      _editingStep = null;
      _editController.clear();
    });
  }

  void _submitModification(int stepIndex) {
    final text = _editController.text.trim();
    if (text.isNotEmpty) {
      widget.onResponse(KActionPlanResponse(
        stepIndex: stepIndex,
        action: KActionPlanAction.modify,
        modification: text,
      ));
    }
    setState(() {
      _editingStep = null;
      _editController.clear();
    });
  }

  ({Color bg, Color text}) _statusColors(KActionPlanStepStatus status) {
    switch (status) {
      case KActionPlanStepStatus.approved:
        return (bg: const Color(0xFFF0FDF4), text: PrismColors.statusSuccess);
      case KActionPlanStepStatus.rejected:
        return (bg: const Color(0xFFFEF2F2), text: PrismColors.statusError);
      case KActionPlanStepStatus.modified:
        return (bg: const Color(0xFFFFFBEB), text: PrismColors.statusWarning);
      case KActionPlanStepStatus.pending:
        return (bg: PrismColors.surfaceElevated, text: PrismColors.textSecondary);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.steps.isEmpty) return const SizedBox.shrink();

    final resolved =
        widget.steps.where((s) => s.status != KActionPlanStepStatus.pending).length;
    final allResolved = resolved == widget.steps.length;

    return Semantics(
      label: 'Action plan',
      container: true,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: PrismColors.surfaceCard,
          border: Border.all(color: PrismColors.borderDefault),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Text(
                'Action Plan ($resolved/${widget.steps.length} reviewed)',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: PrismColors.textPrimary,
                ),
              ),
            ),
            for (final step in widget.steps) _buildStep(step),
            if (allResolved)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Center(
                  child: Text(
                    'All steps reviewed',
                    style: TextStyle(
                      color: PrismColors.statusSuccess,
                      fontWeight: FontWeight.w500,
                      fontSize: 13,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStep(KActionPlanStep step) {
    final colors = _statusColors(step.status);
    final label = step.status == KActionPlanStepStatus.approved
        ? '✓'
        : step.status == KActionPlanStepStatus.rejected
            ? '✗'
            : step.status == KActionPlanStepStatus.modified
                ? '~'
                : '${step.index + 1}';

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: PrismColors.borderSubtle)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 24,
            height: 24,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: colors.bg, shape: BoxShape.circle),
            child: Text(
              label,
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: colors.text),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  step.description,
                  style: const TextStyle(
                    color: PrismColors.textPrimary,
                    fontSize: 14,
                    height: 1.5,
                  ),
                ),
                if (step.modification != null)
                  Container(
                    margin: const EdgeInsets.only(top: 4),
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFBEB),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      'Modified: ${step.modification}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: PrismColors.statusWarning,
                      ),
                    ),
                  ),
                if (_editingStep == step.index) _buildEditor(step.index),
                if (step.status == KActionPlanStepStatus.pending && _editingStep != step.index)
                  _buildActionButtons(step.index),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEditor(int stepIndex) {
    final canSave = _editController.text.trim().isNotEmpty;
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(
        children: [
          Expanded(
            // `CallbackShortcuts` lets us dismiss the editor with Escape
            // (matches web `action-plan.tsx:144`). Enter still submits via
            // the TextField's `onSubmitted`.
            child: CallbackShortcuts(
              bindings: {
                const SingleActivator(LogicalKeyboardKey.escape): _cancelModify,
              },
              child: TextField(
                controller: _editController,
                autofocus: true,
                decoration: const InputDecoration(
                  hintText: 'Describe the modification...',
                  isDense: true,
                  contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  border: OutlineInputBorder(),
                ),
                style: const TextStyle(fontSize: 13),
                onSubmitted: (_) => _submitModification(stepIndex),
              ),
            ),
          ),
          const SizedBox(width: 8),
          ElevatedButton(
            onPressed: canSave ? () => _submitModification(stepIndex) : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: PrismColors.interactivePrimary,
              foregroundColor: PrismColors.textOnPrimary,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            ),
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons(int stepIndex) {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(
        children: [
          _ActionButton(
            label: 'Approve',
            color: PrismColors.statusSuccess,
            onPressed: () => widget.onResponse(
              KActionPlanResponse(stepIndex: stepIndex, action: KActionPlanAction.approve),
            ),
          ),
          const SizedBox(width: 6),
          _ActionButton(
            label: 'Modify',
            color: PrismColors.statusWarning,
            onPressed: () => _startModify(stepIndex),
          ),
          const SizedBox(width: 6),
          _ActionButton(
            label: 'Reject',
            color: PrismColors.statusError,
            onPressed: () => widget.onResponse(
              KActionPlanResponse(stepIndex: stepIndex, action: KActionPlanAction.reject),
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final Color color;
  final VoidCallback onPressed;

  const _ActionButton({required this.label, required this.color, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: PrismColors.textOnPrimary,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
      ),
      child: Text(label),
    );
  }
}

// ============================================================================
// KSuggestionChips — horizontal scrollable row
// ============================================================================

class _KSuggestionChipsRow extends StatelessWidget {
  final List<KSuggestionChip> suggestions;
  final void Function(KSuggestionChip) onSelect;

  const _KSuggestionChipsRow({required this.suggestions, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    if (suggestions.isEmpty) return const SizedBox.shrink();

    return Semantics(
      label: 'Suggested prompts',
      container: true,
      child: SizedBox(
        height: 40,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(vertical: 4),
          itemCount: suggestions.length,
          separatorBuilder: (_, __) => const SizedBox(width: 8),
          itemBuilder: (context, i) {
            final chip = suggestions[i];
            return InkWell(
              onTap: () => onSelect(chip),
              borderRadius: BorderRadius.circular(PrismRadius.pill),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: PrismColors.surfaceCard,
                  border: Border.all(color: PrismColors.borderDefault),
                  borderRadius: BorderRadius.circular(PrismRadius.pill),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (chip.icon != null) ...[
                      Icon(chip.icon, size: 14, color: PrismColors.textPrimary),
                      const SizedBox(width: 6),
                    ],
                    Text(
                      chip.label,
                      style: const TextStyle(
                        fontSize: 13,
                        color: PrismColors.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

// ============================================================================
// KChatInput — auto-growing textarea with send. Cmd/Ctrl+Enter sends.
//
// Attachments are not wired in Phase 1 — a real file picker requires a
// platform-channel package (e.g. `file_picker`). Removed to avoid a stub.
// See journal 0019-GAP-flutter-chat-attachments-deferred.md.
// ============================================================================

class _KChatInput extends StatefulWidget {
  final TextEditingController controller;
  final VoidCallback onSend;
  final String placeholder;
  final bool disabled;
  final int? maxLength;

  const _KChatInput({
    required this.controller,
    required this.onSend,
    required this.placeholder,
    required this.disabled,
    required this.maxLength,
  });

  @override
  State<_KChatInput> createState() => _KChatInputState();
}

class _KChatInputState extends State<_KChatInput> {
  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onChanged);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onChanged);
    super.dispose();
  }

  void _onChanged() {
    if (!mounted) return;
    setState(() {});
  }

  bool get _canSend => widget.controller.text.trim().isNotEmpty && !widget.disabled;

  void _handleShortcutSend() {
    if (_canSend) widget.onSend();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: const BoxDecoration(
        color: PrismColors.surfaceCard,
        border: Border(top: BorderSide(color: PrismColors.borderDefault)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            // `CallbackShortcuts` registers the shortcut on the TextField's
            // own focus scope, so Cmd/Ctrl+Enter fires while the user is
            // typing. A plain `KeyboardListener` with a separate FocusNode
            // never fires because the TextField owns focus.
            child: CallbackShortcuts(
              bindings: {
                const SingleActivator(LogicalKeyboardKey.enter, meta: true):
                    _handleShortcutSend,
                const SingleActivator(LogicalKeyboardKey.enter, control: true):
                    _handleShortcutSend,
              },
              child: TextField(
                controller: widget.controller,
                enabled: !widget.disabled,
                maxLines: 5,
                minLines: 1,
                maxLength: widget.maxLength,
                decoration: InputDecoration(
                  hintText: widget.placeholder,
                  isDense: true,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(PrismRadius.md),
                  ),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  counterText: '',
                ),
                style: const TextStyle(fontSize: 14, height: 1.5),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Semantics(
            label: 'Send message',
            button: true,
            child: InkWell(
              onTap: _canSend ? widget.onSend : null,
              borderRadius: BorderRadius.circular(PrismRadius.md),
              child: Container(
                width: 36,
                height: 36,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: _canSend
                      ? PrismColors.interactivePrimary
                      : PrismColors.surfaceElevated,
                  borderRadius: BorderRadius.circular(PrismRadius.md),
                ),
                child: Icon(
                  Icons.arrow_upward,
                  size: 18,
                  color: _canSend ? PrismColors.textOnPrimary : PrismColors.textDisabled,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
