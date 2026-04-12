import 'package:flutter/material.dart';
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

  const KSettingsTemplate({
    super.key,
    required this.title,
    required this.content,
    this.subtitle,
    this.headerActions,
    this.settingsNav,
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
                primary: settingsNav!,
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
// ============================================================================

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
                  border: Border(right: BorderSide(color: PrismColors.borderDefault)),
                ),
                child: conversationList!,
              ),
            Expanded(child: content),
            if (detailPanel != null && !hideDetail)
              Container(
                width: detailWidth,
                decoration: const BoxDecoration(
                  color: PrismColors.surfaceCard,
                  border: Border(left: BorderSide(color: PrismColors.borderDefault)),
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
    return KStack.vertical(
      gap: PrismSpacing.lg,
      children: [
        KTemplateHeader(title: title, subtitle: subtitle, actions: headerActions),
        Semantics(
          label: 'Kanban board',
          container: true,
          child: SizedBox(
            height: 400,
            child: ListView.separated(
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
