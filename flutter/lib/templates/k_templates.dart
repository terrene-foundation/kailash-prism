import 'package:flutter/material.dart';
import '../engines/k_chat.dart';
import '../engines/k_chat_sidebar.dart';
import '../layouts/k_layout.dart';
import '../layouts/k_responsive.dart';
import '../theme/prism_colors.dart';
import '../theme/prism_spacing.dart';

/// Kailash Prism — Flutter page templates.
///
/// 11 templates mirroring web semantics:
///   KDashboardTemplate, KListTemplate, KDetailTemplate, KFormTemplate,
///   KSettingsTemplate, KAuthTemplate, KConversationTemplate, KSplitTemplate,
///   KWizardTemplate, KKanbanTemplate, KCalendarTemplate
///
/// Each template:
///   - Has a consistent header (title/subtitle/headerActions) via KTemplateHeader
///   - Composes KLayout primitives (KStack, KGrid, KSplit)
///   - Adapts responsively via KResponsiveBuilder (stacks on mobile, splits on desktop)
///
/// Spec: docs/specs/06-page-templates.md

// ============================================================================
// KTemplateHeader — shared header widget
// ============================================================================

class KTemplateHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<Widget>? actions;

  const KTemplateHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.actions,
  });

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 48),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    color: PrismColors.textPrimary,
                    height: 1.3,
                  ),
                ),
                if (subtitle != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      subtitle!,
                      style: const TextStyle(
                        fontSize: 14,
                        color: PrismColors.textSecondary,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          if (actions != null && actions!.isNotEmpty) ...[
            const SizedBox(width: PrismSpacing.lg),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (var i = 0; i < actions!.length; i++) ...[
                  if (i > 0) const SizedBox(width: PrismSpacing.sm),
                  actions![i],
                ],
              ],
            ),
          ],
        ],
      ),
    );
  }
}

// ============================================================================
// KDashboardTemplate — stats-row / split(primary/secondary) / detail-grid
// ============================================================================

class KDashboardTemplate extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<Widget>? headerActions;
  final List<Widget>? statsRow;
  final Widget? primaryChart;
  final Widget? secondaryContent;
  final List<Widget>? detailGrid;

  const KDashboardTemplate({
    super.key,
    required this.title,
    this.subtitle,
    this.headerActions,
    this.statsRow,
    this.primaryChart,
    this.secondaryContent,
    this.detailGrid,
  });

  @override
  Widget build(BuildContext context) {
    return KResponsiveBuilder(
      builder: (context, breakpoint, _) {
        final isMobile = breakpoint == KBreakpoint.mobile;
        final isTablet = breakpoint == KBreakpoint.tablet;

        return KStack.vertical(
          gap: PrismSpacing.xl,
          children: [
            KTemplateHeader(title: title, subtitle: subtitle, actions: headerActions),
            if (statsRow != null && statsRow!.isNotEmpty)
              KGrid(
                columns: const KResponsiveValue<int>(mobile: 1, tablet: 2, desktop: 4),
                defaultColumns: 1,
                gap: PrismSpacing.lg,
                rowGap: PrismSpacing.lg,
                children: statsRow!,
              ),
            if (primaryChart != null || secondaryContent != null)
              if (isMobile || isTablet)
                KStack.vertical(
                  gap: PrismSpacing.lg,
                  children: [
                    if (primaryChart != null) primaryChart!,
                    if (secondaryContent != null) secondaryContent!,
                  ],
                )
              else
                KSplit(
                  primary: primaryChart ?? const SizedBox.shrink(),
                  secondary: secondaryContent ?? const SizedBox.shrink(),
                  primaryFlex: 2,
                  secondaryFlex: 1,
                  gap: PrismSpacing.lg,
                ),
            if (detailGrid != null && detailGrid!.isNotEmpty)
              KGrid(
                columns: const KResponsiveValue<int>(mobile: 1, tablet: 2, desktop: 3),
                defaultColumns: 1,
                gap: PrismSpacing.lg,
                rowGap: PrismSpacing.lg,
                children: detailGrid!,
              ),
          ],
        );
      },
    );
  }
}

// ============================================================================
// KListTemplate — filter-bar / content / footer
// ============================================================================

class KListTemplate extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<Widget>? headerActions;
  final Widget? filterBar;
  final Widget content;
  final Widget? footer;

  const KListTemplate({
    super.key,
    required this.title,
    required this.content,
    this.subtitle,
    this.headerActions,
    this.filterBar,
    this.footer,
  });

  @override
  Widget build(BuildContext context) {
    return KStack.vertical(
      gap: PrismSpacing.lg,
      children: [
        KTemplateHeader(title: title, subtitle: subtitle, actions: headerActions),
        if (filterBar != null) filterBar!,
        content,
        if (footer != null) footer!,
      ],
    );
  }
}

// ============================================================================
// KDetailTemplate — summary / (content | sidebar) / related
// ============================================================================

class KDetailTemplate extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<Widget>? headerActions;
  final Widget? summary;
  final Widget content;
  final Widget? sidebar;
  final Widget? related;

  const KDetailTemplate({
    super.key,
    required this.title,
    required this.content,
    this.subtitle,
    this.headerActions,
    this.summary,
    this.sidebar,
    this.related,
  });

  @override
  Widget build(BuildContext context) {
    return KResponsiveBuilder(
      builder: (context, breakpoint, _) {
        final stackSidebar = breakpoint == KBreakpoint.mobile || breakpoint == KBreakpoint.tablet;

        return KStack.vertical(
          gap: PrismSpacing.xl,
          children: [
            KTemplateHeader(title: title, subtitle: subtitle, actions: headerActions),
            if (summary != null) summary!,
            if (sidebar != null && !stackSidebar)
              KSplit(
                primary: content,
                secondary: sidebar!,
                primaryFlex: 2,
                secondaryFlex: 1,
                gap: PrismSpacing.xl,
              )
            else
              KStack.vertical(
                gap: PrismSpacing.xl,
                children: [
                  content,
                  if (sidebar != null) sidebar!,
                ],
              ),
            if (related != null) related!,
          ],
        );
      },
    );
  }
}

// ============================================================================
// KFormTemplate — centered form with optional help sidebar
// ============================================================================

class KFormTemplate extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<Widget>? headerActions;
  final Widget content;
  final Widget? sidebar;
  final double maxWidth;

  const KFormTemplate({
    super.key,
    required this.title,
    required this.content,
    this.subtitle,
    this.headerActions,
    this.sidebar,
    this.maxWidth = 720,
  });

  @override
  Widget build(BuildContext context) {
    return KResponsiveBuilder(
      builder: (context, breakpoint, _) {
        final stackSidebar = breakpoint == KBreakpoint.mobile || breakpoint == KBreakpoint.tablet;

        final formArea = ConstrainedBox(
          constraints: BoxConstraints(maxWidth: stackSidebar && sidebar != null ? double.infinity : maxWidth),
          child: content,
        );

        return KStack.vertical(
          gap: PrismSpacing.xl,
          children: [
            KTemplateHeader(title: title, subtitle: subtitle, actions: headerActions),
            if (sidebar != null && !stackSidebar)
              KSplit(
                primary: formArea,
                secondary: sidebar!,
                primaryFlex: 2,
                secondaryFlex: 1,
                gap: PrismSpacing.xl,
              )
            else
              KStack.vertical(
                gap: PrismSpacing.xl,
                children: [
                  formArea,
                  if (sidebar != null) sidebar!,
                ],
              ),
          ],
        );
      },
    );
  }
}

// ============================================================================
// KSettingsTemplate — 1:3 nav/content split
// ============================================================================

class KSettingsTemplate extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<Widget>? headerActions;
  final Widget? settingsNav;
  final Widget content;

  /// Minimum width in logical pixels for the settings nav column on desktop.
  /// At the 1024px desktop lower bound, a raw 1:3 flex split crushes the nav
  /// to ~240px minus padding, wrapping or truncating link labels. We cap the
  /// minimum to keep the nav usable.
  final double navMinWidth;

  const KSettingsTemplate({
    super.key,
    required this.title,
    required this.content,
    this.subtitle,
    this.headerActions,
    this.settingsNav,
    this.navMinWidth = 200,
  });

  @override
  Widget build(BuildContext context) {
    return KResponsiveBuilder(
      builder: (context, breakpoint, _) {
        final isMobile = breakpoint == KBreakpoint.mobile;

        return KStack.vertical(
          gap: PrismSpacing.xl,
          children: [
            KTemplateHeader(title: title, subtitle: subtitle, actions: headerActions),
            if (settingsNav != null && !isMobile)
              KSplit(
                primary: ConstrainedBox(
                  constraints: BoxConstraints(minWidth: navMinWidth),
                  child: settingsNav!,
                ),
                secondary: content,
                primaryFlex: 1,
                secondaryFlex: 3,
                gap: PrismSpacing.xl,
              )
            else
              KStack.vertical(
                gap: PrismSpacing.lg,
                children: [
                  if (settingsNav != null) settingsNav!,
                  content,
                ],
              ),
          ],
        );
      },
    );
  }
}

// ============================================================================
// KAuthTemplate — centered card with optional brand panel
// ============================================================================

class KAuthTemplate extends StatelessWidget {
  final Widget content;
  final Widget? brandPanel;
  final double maxWidth;

  const KAuthTemplate({
    super.key,
    required this.content,
    this.brandPanel,
    this.maxWidth = 420,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: PrismColors.gray50,
      constraints: const BoxConstraints(minHeight: double.infinity),
      child: KResponsiveBuilder(
        builder: (context, breakpoint, _) {
          final showBrand = brandPanel != null && breakpoint != KBreakpoint.mobile;

          final card = Container(
            width: double.infinity,
            constraints: BoxConstraints(maxWidth: maxWidth),
            padding: const EdgeInsets.all(PrismSpacing.xxl),
            decoration: BoxDecoration(
              color: PrismColors.surfaceCard,
              borderRadius: BorderRadius.circular(PrismRadius.lg),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x1A000000),
                  blurRadius: 15,
                  offset: Offset(0, 10),
                ),
              ],
            ),
            child: content,
          );

          final formPanel = Center(
            child: Padding(
              padding: const EdgeInsets.all(PrismSpacing.xl),
              child: card,
            ),
          );

          if (!showBrand) return formPanel;

          return Row(
            children: [
              Expanded(
                flex: 2,
                child: Container(
                  color: PrismColors.interactivePrimary,
                  padding: const EdgeInsets.all(PrismSpacing.xxxl),
                  alignment: Alignment.center,
                  child: DefaultTextStyle.merge(
                    style: const TextStyle(color: PrismColors.textOnPrimary),
                    child: brandPanel!,
                  ),
                ),
              ),
              Expanded(flex: 3, child: formPanel),
            ],
          );
        },
      ),
    );
  }
}

// ============================================================================
// KConversationTemplate — chat layout with optional list + detail panels
//
// Two usage modes:
//
// 1. **Wired mode** (recommended): Pass `adapter` + optional overrides.
//    The template internally wires KConversationSidebar, KChatEngine,
//    and KChatState into a turnkey chat layout.
//
// 2. **Manual mode**: Pass `conversationList` + `content` as Widgets.
//    Full control, no internal state management.
// ============================================================================

/// Manual-mode conversation template — bare layout with consumer-supplied widgets.
class KConversationTemplate extends StatelessWidget {
  final Widget? conversationList;
  final Widget content;
  final Widget? detailPanel;
  final double listWidth;
  final double detailWidth;

  const KConversationTemplate({
    super.key,
    required this.content,
    this.conversationList,
    this.detailPanel,
    this.listWidth = 280,
    this.detailWidth = 320,
  });

  @override
  Widget build(BuildContext context) {
    return _ConversationLayout(
      conversationList: conversationList,
      content: content,
      detailPanel: detailPanel,
      listWidth: listWidth,
      detailWidth: detailWidth,
    );
  }
}

/// Wired-mode conversation template — pass a [KChatAdapter] and the template
/// internally composes [KConversationSidebar], [KChatEngine], and [KChatState].
class KWiredConversationTemplate extends StatefulWidget {
  /// Transport adapter — required for wired mode.
  final KChatAdapter adapter;

  /// Whether to auto-load conversations on mount. Default: true.
  final bool autoLoad;

  /// Detail panel widget (e.g. citation panel).
  final Widget? detailPanel;

  /// Build custom metadata per conversation row (e.g. risk tier badge).
  final Widget Function(KConversationSummary)? metaBuilder;

  /// Chat engine avatars.
  final Widget? userAvatar;
  final Widget? assistantAvatar;

  /// Chat engine feature toggles.
  final KChatFeatures features;

  /// Chat input configuration.
  final KChatInputConfig input;

  /// Active tool call steps for StreamOfThought display.
  final List<KToolCallStep> toolCallSteps;

  /// Action plan awaiting user response.
  final List<KActionPlanStep>? actionPlan;

  /// Suggestion chips.
  final List<KSuggestionChip> suggestions;

  /// Callbacks for advanced consumers.
  final void Function(KActionPlanResponse response)? onActionPlanResponse;
  final void Function(KCitation citation)? onCitationClick;
  final void Function(KSuggestionChip suggestion)? onSuggestionClick;
  final void Function(String messageId)? onRetry;

  /// Called after a message is sent (for domain-specific side effects).
  final void Function(String content)? onMessageSent;

  /// Called when the active conversation changes.
  final void Function(String? id)? onConversationChange;

  /// Override the rendered chat content entirely.
  final Widget Function(KChatState state)? contentBuilder;

  /// Override the rendered sidebar entirely.
  final Widget Function(KChatState state)? sidebarBuilder;

  final double listWidth;
  final double detailWidth;

  const KWiredConversationTemplate({
    super.key,
    required this.adapter,
    this.autoLoad = true,
    this.detailPanel,
    this.metaBuilder,
    this.userAvatar,
    this.assistantAvatar,
    this.features = const KChatFeatures(),
    this.input = const KChatInputConfig(),
    this.toolCallSteps = const [],
    this.actionPlan,
    this.suggestions = const [],
    this.onActionPlanResponse,
    this.onCitationClick,
    this.onSuggestionClick,
    this.onRetry,
    this.onMessageSent,
    this.onConversationChange,
    this.contentBuilder,
    this.sidebarBuilder,
    this.listWidth = 280,
    this.detailWidth = 320,
  });

  @override
  State<KWiredConversationTemplate> createState() =>
      _KWiredConversationTemplateState();
}

class _KWiredConversationTemplateState
    extends State<KWiredConversationTemplate> {
  late KChatState _chatState;
  bool _sidebarCollapsed = false;

  @override
  void initState() {
    super.initState();
    _chatState = KChatState(widget.adapter);
    if (widget.autoLoad) {
      _chatState.loadConversations();
    }
  }

  @override
  void dispose() {
    _chatState.dispose();
    super.dispose();
  }

  void _handleSend(KChatSendEvent event) {
    _chatState.sendMessage(event.content);
    widget.onMessageSent?.call(event.content);
  }

  void _handleSelect(String id) {
    _chatState.switchConversation(id);
    widget.onConversationChange?.call(id);
  }

  void _handleNew() {
    _chatState.startNewConversation();
    widget.onConversationChange?.call(null);
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _chatState,
      builder: (context, _) {
        final sidebar = widget.sidebarBuilder != null
            ? widget.sidebarBuilder!(_chatState)
            : KConversationSidebar(
                conversations: _chatState.conversations,
                activeId: _chatState.activeConversationId,
                onSelect: _handleSelect,
                onNew: _handleNew,
                onDelete: _chatState.deleteConversation,
                onRename: _chatState.renameConversation,
                collapsed: _sidebarCollapsed,
                onToggleCollapse: () =>
                    setState(() => _sidebarCollapsed = !_sidebarCollapsed),
                metaBuilder: widget.metaBuilder,
              );

        final content = widget.contentBuilder != null
            ? widget.contentBuilder!(_chatState)
            : KChatEngine(
                messages: _chatState.messages,
                isStreaming: _chatState.isStreaming,
                streamBuffer: _chatState.streamBuffer,
                toolCallSteps: widget.toolCallSteps,
                actionPlan: widget.actionPlan,
                suggestions: widget.suggestions,
                input: widget.input,
                features: widget.features,
                userAvatar: widget.userAvatar,
                assistantAvatar: widget.assistantAvatar,
                onSend: _handleSend,
                onActionPlanResponse: widget.onActionPlanResponse,
                onCitationClick: widget.onCitationClick,
                onSuggestionClick: widget.onSuggestionClick,
                onRetry: widget.onRetry,
              );

        return _ConversationLayout(
          conversationList: sidebar,
          content: content,
          detailPanel: widget.detailPanel,
          listWidth: _sidebarCollapsed ? 52 : widget.listWidth,
          detailWidth: widget.detailWidth,
        );
      },
    );
  }
}

/// Shared responsive layout used by both manual and wired conversation templates.
class _ConversationLayout extends StatelessWidget {
  final Widget? conversationList;
  final Widget content;
  final Widget? detailPanel;
  final double listWidth;
  final double detailWidth;

  const _ConversationLayout({
    required this.content,
    this.conversationList,
    this.detailPanel,
    this.listWidth = 280,
    this.detailWidth = 320,
  });

  @override
  Widget build(BuildContext context) {
    return KResponsiveBuilder(
      builder: (context, breakpoint, _) {
        final hideList = breakpoint == KBreakpoint.mobile;
        final hideDetail =
            breakpoint == KBreakpoint.mobile || breakpoint == KBreakpoint.tablet;

        return Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (conversationList != null && !hideList)
              Container(
                width: listWidth,
                decoration: const BoxDecoration(
                  color: PrismColors.surfaceCard,
                  border:
                      Border(right: BorderSide(color: PrismColors.borderDefault)),
                ),
                child: conversationList!,
              ),
            Expanded(child: content),
            if (detailPanel != null && !hideDetail)
              Container(
                width: detailWidth,
                decoration: const BoxDecoration(
                  color: PrismColors.surfaceCard,
                  border:
                      Border(left: BorderSide(color: PrismColors.borderDefault)),
                ),
                child: detailPanel!,
              ),
          ],
        );
      },
    );
  }
}

// ============================================================================
// KSplitTemplate — generic two-panel with configurable flex
// ============================================================================

class KSplitTemplate extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<Widget>? headerActions;
  final Widget primary;
  final Widget secondary;
  final int primaryFlex;
  final int secondaryFlex;

  const KSplitTemplate({
    super.key,
    required this.title,
    required this.primary,
    required this.secondary,
    this.subtitle,
    this.headerActions,
    this.primaryFlex = 1,
    this.secondaryFlex = 1,
  });

  @override
  Widget build(BuildContext context) {
    return KResponsiveBuilder(
      builder: (context, breakpoint, _) {
        final isMobile = breakpoint == KBreakpoint.mobile;
        return KStack.vertical(
          gap: PrismSpacing.xl,
          children: [
            KTemplateHeader(title: title, subtitle: subtitle, actions: headerActions),
            if (isMobile)
              KStack.vertical(gap: PrismSpacing.lg, children: [primary, secondary])
            else
              KSplit(
                primary: primary,
                secondary: secondary,
                primaryFlex: primaryFlex.toDouble(),
                secondaryFlex: secondaryFlex.toDouble(),
                gap: PrismSpacing.xl,
              ),
          ],
        );
      },
    );
  }
}

// ============================================================================
// KWizardTemplate — centered multi-step form area
// ============================================================================

class KWizardTemplate extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<Widget>? headerActions;
  final Widget content;
  final double maxWidth;

  const KWizardTemplate({
    super.key,
    required this.title,
    required this.content,
    this.subtitle,
    this.headerActions,
    this.maxWidth = 640,
  });

  @override
  Widget build(BuildContext context) {
    return KStack.vertical(
      gap: PrismSpacing.xl,
      children: [
        KTemplateHeader(title: title, subtitle: subtitle, actions: headerActions),
        Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: maxWidth),
            child: SizedBox(width: double.infinity, child: content),
          ),
        ),
      ],
    );
  }
}

// ============================================================================
// KKanbanTemplate — horizontal scrollable column board
// ============================================================================

class KKanbanColumn {
  final String id;
  final String title;
  final int? count;
  final Widget child;

  const KKanbanColumn({
    required this.id,
    required this.title,
    required this.child,
    this.count,
  });
}

class KKanbanTemplate extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<Widget>? headerActions;
  final List<KKanbanColumn> columns;
  final double columnWidth;

  const KKanbanTemplate({
    super.key,
    required this.title,
    required this.columns,
    this.subtitle,
    this.headerActions,
    this.columnWidth = 300,
  });

  @override
  Widget build(BuildContext context) {
    // Board uses its own horizontal scroll controller so the `Scrollbar`
    // wrapper can attach to it — on desktop Flutter this makes the scroll
    // affordance visible, and enables keyboard arrow-key scroll traversal
    // across columns (WCAG 2.1.1).
    final scrollController = ScrollController();

    return KStack.vertical(
      gap: PrismSpacing.lg,
      children: [
        KTemplateHeader(title: title, subtitle: subtitle, actions: headerActions),
        Semantics(
          label: 'Kanban board',
          container: true,
          child: SizedBox(
            height: 400,
            child: Scrollbar(
              controller: scrollController,
              thumbVisibility: true,
              child: ListView.separated(
                controller: scrollController,
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.only(bottom: PrismSpacing.lg),
                itemCount: columns.length,
                separatorBuilder: (_, __) => const SizedBox(width: PrismSpacing.lg),
              itemBuilder: (context, i) {
                final col = columns[i];
                return Container(
                  width: columnWidth,
                  padding: const EdgeInsets.all(PrismSpacing.md),
                  decoration: BoxDecoration(
                    color: PrismColors.surfaceElevated,
                    borderRadius: BorderRadius.circular(PrismRadius.md),
                  ),
                  child: Semantics(
                    label: col.title,
                    container: true,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Padding(
                          padding: const EdgeInsets.fromLTRB(4, 4, 4, 8),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  col.title,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: PrismColors.textPrimary,
                                  ),
                                ),
                              ),
                              if (col.count != null)
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: PrismColors.surfaceCard,
                                    borderRadius: BorderRadius.circular(PrismRadius.pill),
                                  ),
                                  child: Text(
                                    '${col.count}',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: PrismColors.textSecondary,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                        Expanded(child: col.child),
                      ],
                    ),
                  ),
                  );
                },
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// ============================================================================
// KCalendarTemplate — view controls + content / event-detail split
// ============================================================================

class KCalendarTemplate extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<Widget>? headerActions;
  final List<Widget>? viewControls;
  final Widget content;
  final Widget? eventDetail;

  const KCalendarTemplate({
    super.key,
    required this.title,
    required this.content,
    this.subtitle,
    this.headerActions,
    this.viewControls,
    this.eventDetail,
  });

  @override
  Widget build(BuildContext context) {
    return KResponsiveBuilder(
      builder: (context, breakpoint, _) {
        final stackDetail =
            breakpoint == KBreakpoint.mobile || breakpoint == KBreakpoint.tablet;

        final mergedActions = <Widget>[
          if (viewControls != null) ...viewControls!,
          if (headerActions != null) ...headerActions!,
        ];

        return KStack.vertical(
          gap: PrismSpacing.lg,
          children: [
            KTemplateHeader(
              title: title,
              subtitle: subtitle,
              actions: mergedActions.isEmpty ? null : mergedActions,
            ),
            if (eventDetail != null && !stackDetail)
              KSplit(
                primary: content,
                secondary: eventDetail!,
                primaryFlex: 3,
                secondaryFlex: 1,
                gap: PrismSpacing.lg,
              )
            else
              KStack.vertical(
                gap: PrismSpacing.lg,
                children: [
                  content,
                  if (eventDetail != null) eventDetail!,
                ],
              ),
          ],
        );
      },
    );
  }
}
