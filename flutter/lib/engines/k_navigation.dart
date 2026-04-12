import 'package:flutter/material.dart';
import '../layouts/k_responsive.dart';
import '../theme/prism_colors.dart';

/// KNavigation — Sidebar + breadcrumb + app shell.
/// Mirrors web navigation.tsx semantics with Material 3 idioms.

/// Route node definition for the navigation tree.
class KRouteNode {
  final String path;
  final String label;
  final IconData? icon;
  final int? badgeCount;
  final bool? showBadgeDot;
  final List<KRouteNode>? children;
  final bool navVisible;
  final bool dividerBefore;
  final bool bottomAligned;

  const KRouteNode({
    required this.path,
    required this.label,
    this.icon,
    this.badgeCount,
    this.showBadgeDot,
    this.children,
    this.navVisible = true,
    this.dividerBefore = false,
    this.bottomAligned = false,
  });
}

/// Navigation state passed through context.
class KNavigationState {
  final String currentPath;
  final KRouteNode? activeRoute;
  final List<KRouteNode> breadcrumbs;
  final bool sidebarCollapsed;
  final void Function(String path) navigate;
  final void Function() toggleSidebar;

  const KNavigationState({
    required this.currentPath,
    required this.activeRoute,
    required this.breadcrumbs,
    required this.sidebarCollapsed,
    required this.navigate,
    required this.toggleSidebar,
  });
}

/// Route matching utilities.
abstract final class KRouteMatcher {
  static KRouteNode? match(List<KRouteNode> routes, String path, {bool prefix = true}) {
    for (final route in routes) {
      if (prefix && path.startsWith(route.path) && route.path != '/') {
        if (route.children != null) {
          final childMatch = match(route.children!, path, prefix: prefix);
          if (childMatch != null) return childMatch;
        }
        return route;
      }
      if (!prefix && route.path == path) return route;
      if (route.children != null) {
        final childMatch = match(route.children!, path, prefix: prefix);
        if (childMatch != null) return childMatch;
      }
    }
    return null;
  }

  static List<KRouteNode> breadcrumbs(List<KRouteNode> routes, String path) {
    final crumbs = <KRouteNode>[];
    bool walk(List<KRouteNode> nodes, String target) {
      for (final node in nodes) {
        if (target == node.path || target.startsWith('${node.path}/')) {
          crumbs.add(node);
          if (node.children != null && walk(node.children!, target)) return true;
          if (target == node.path) return true;
        }
      }
      return false;
    }
    walk(routes, path);
    return crumbs;
  }
}

/// KAppShell — Full application scaffold with sidebar + content area.
class KAppShell extends StatefulWidget {
  final List<KRouteNode> routes;
  final String currentPath;
  final Widget child;
  final Widget? header;
  final bool showBreadcrumbs;
  final void Function(String from, String to)? onNavigate;

  const KAppShell({
    super.key,
    required this.routes,
    required this.child,
    this.currentPath = '/',
    this.header,
    this.showBreadcrumbs = true,
    this.onNavigate,
  });

  @override
  State<KAppShell> createState() => _KAppShellState();
}

class _KAppShellState extends State<KAppShell> {
  late String _currentPath;
  bool _collapsed = false;

  @override
  void initState() {
    super.initState();
    _currentPath = widget.currentPath;
  }

  void _navigate(String path) {
    final prev = _currentPath;
    setState(() => _currentPath = path);
    widget.onNavigate?.call(prev, path);
  }

  void _toggleSidebar() {
    setState(() => _collapsed = !_collapsed);
  }

  @override
  Widget build(BuildContext context) {
    return KResponsiveBuilder(
      builder: (context, breakpoint, _) {
        final isMobile = breakpoint == KBreakpoint.mobile;
        final activeRoute = KRouteMatcher.match(widget.routes, _currentPath);
        final breadcrumbs = KRouteMatcher.breadcrumbs(widget.routes, _currentPath);

        if (isMobile) {
          return Scaffold(
            appBar: AppBar(
              title: Text(activeRoute?.label ?? 'Page'),
              leading: Builder(
                builder: (ctx) => IconButton(
                  icon: const Icon(Icons.menu),
                  onPressed: () => Scaffold.of(ctx).openDrawer(),
                ),
              ),
            ),
            drawer: Drawer(
              child: SafeArea(
                child: _NavItemList(
                  routes: widget.routes,
                  currentPath: _currentPath,
                  collapsed: false,
                  onNavigate: (path) {
                    Navigator.pop(context);
                    _navigate(path);
                  },
                ),
              ),
            ),
            body: Column(
              children: [
                if (widget.showBreadcrumbs && breadcrumbs.isNotEmpty)
                  _Breadcrumbs(breadcrumbs: breadcrumbs, onNavigate: _navigate),
                Expanded(child: widget.child),
              ],
            ),
          );
        }

        // Desktop/tablet: persistent sidebar
        return Scaffold(
          body: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _Sidebar(
                routes: widget.routes,
                currentPath: _currentPath,
                collapsed: _collapsed,
                onNavigate: _navigate,
                onToggleCollapse: _toggleSidebar,
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (widget.header != null) widget.header!,
                    if (widget.showBreadcrumbs && breadcrumbs.isNotEmpty)
                      _Breadcrumbs(breadcrumbs: breadcrumbs, onNavigate: _navigate),
                    Expanded(child: widget.child),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _Sidebar extends StatelessWidget {
  final List<KRouteNode> routes;
  final String currentPath;
  final bool collapsed;
  final void Function(String) onNavigate;
  final VoidCallback onToggleCollapse;

  const _Sidebar({
    required this.routes,
    required this.currentPath,
    required this.collapsed,
    required this.onNavigate,
    required this.onToggleCollapse,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: collapsed ? 64 : 240,
      decoration: const BoxDecoration(
        color: PrismColors.surfaceCard,
        border: Border(right: BorderSide(color: PrismColors.borderDefault)),
      ),
      child: Column(
        children: [
          Expanded(
            child: _NavItemList(
              routes: routes,
              currentPath: currentPath,
              collapsed: collapsed,
              onNavigate: onNavigate,
            ),
          ),
          IconButton(
            icon: Icon(collapsed ? Icons.chevron_right : Icons.chevron_left),
            onPressed: onToggleCollapse,
            tooltip: collapsed ? 'Expand sidebar' : 'Collapse sidebar',
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}

class _NavItemList extends StatelessWidget {
  final List<KRouteNode> routes;
  final String currentPath;
  final bool collapsed;
  final void Function(String) onNavigate;

  const _NavItemList({
    required this.routes,
    required this.currentPath,
    required this.collapsed,
    required this.onNavigate,
  });

  @override
  Widget build(BuildContext context) {
    final visible = routes.where((r) => r.navVisible).toList();
    final top = visible.where((r) => !r.bottomAligned).toList();
    final bottom = visible.where((r) => r.bottomAligned).toList();

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.symmetric(vertical: 8),
            children: [
              for (final route in top) _NavItem(
                route: route,
                isActive: currentPath == route.path || currentPath.startsWith('${route.path}/'),
                collapsed: collapsed,
                onTap: () => onNavigate(route.path),
              ),
            ],
          ),
        ),
        if (bottom.isNotEmpty) ...[
          const Divider(height: 1),
          for (final route in bottom) _NavItem(
            route: route,
            isActive: currentPath == route.path || currentPath.startsWith('${route.path}/'),
            collapsed: collapsed,
            onTap: () => onNavigate(route.path),
          ),
        ],
      ],
    );
  }
}

class _NavItem extends StatelessWidget {
  final KRouteNode route;
  final bool isActive;
  final bool collapsed;
  final VoidCallback onTap;

  const _NavItem({
    required this.route,
    required this.isActive,
    required this.collapsed,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final bgColor = isActive ? PrismColors.surfaceElevated : Colors.transparent;
    final fgColor = isActive ? PrismColors.interactivePrimary : PrismColors.textSecondary;

    return Material(
      color: bgColor,
      child: InkWell(
        onTap: onTap,
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          padding: EdgeInsets.symmetric(
            horizontal: collapsed ? 0 : 12,
            vertical: 10,
          ),
          child: Row(
            mainAxisAlignment: collapsed ? MainAxisAlignment.center : MainAxisAlignment.start,
            children: [
              if (route.icon != null) Icon(route.icon, size: 18, color: fgColor),
              if (!collapsed) ...[
                if (route.icon != null) const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    route.label,
                    style: TextStyle(
                      color: fgColor,
                      fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
                      fontSize: 14,
                    ),
                  ),
                ),
                if (route.showBadgeDot == true)
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: PrismColors.statusError,
                      shape: BoxShape.circle,
                    ),
                  )
                else if (route.badgeCount != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: PrismColors.interactivePrimary,
                      borderRadius: BorderRadius.circular(9999),
                    ),
                    child: Text(
                      '${route.badgeCount}',
                      style: const TextStyle(
                        color: PrismColors.textOnPrimary,
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _Breadcrumbs extends StatelessWidget {
  final List<KRouteNode> breadcrumbs;
  final void Function(String) onNavigate;

  const _Breadcrumbs({required this.breadcrumbs, required this.onNavigate});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: PrismColors.borderSubtle)),
      ),
      child: Row(
        children: [
          for (var i = 0; i < breadcrumbs.length; i++) ...[
            if (i > 0)
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 4),
                child: Text('/', style: TextStyle(color: PrismColors.textDisabled, fontSize: 13)),
              ),
            if (i == breadcrumbs.length - 1)
              Text(
                breadcrumbs[i].label,
                style: const TextStyle(
                  color: PrismColors.textPrimary,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              )
            else
              InkWell(
                onTap: () => onNavigate(breadcrumbs[i].path),
                child: Text(
                  breadcrumbs[i].label,
                  style: const TextStyle(color: PrismColors.textSecondary, fontSize: 13),
                ),
              ),
          ],
        ],
      ),
    );
  }
}
