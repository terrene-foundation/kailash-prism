import 'package:flutter/material.dart';
import '../layouts/k_responsive.dart';
import '../theme/prism_colors.dart';

/// KDataTable — Sortable, filterable, paginated data table with selection.
/// Mirrors web DataTable semantics for Flutter.

typedef KDataRow = Map<String, Object?>;

/// Column definition.
class KColumnDef<T extends KDataRow> {
  final String field;
  final String header;
  final double? width;
  final bool sortable;
  final bool filterable;
  final TextAlign align;
  final Widget Function(Object? value, T row)? render;

  const KColumnDef({
    required this.field,
    required this.header,
    this.width,
    this.sortable = true,
    this.filterable = true,
    this.align = TextAlign.left,
    this.render,
  });
}

enum KSortDirection { asc, desc }

class KSortState {
  final String field;
  final KSortDirection direction;
  const KSortState({required this.field, required this.direction});
}

class KBulkAction<T extends KDataRow> {
  final String label;
  final IconData? icon;
  final Color? color;
  final void Function(List<T> rows) onExecute;

  const KBulkAction({
    required this.label,
    this.icon,
    this.color,
    required this.onExecute,
  });
}

/// KDataTable root widget.
class KDataTable<T extends KDataRow> extends StatefulWidget {
  final List<KColumnDef<T>> columns;
  final List<T> data;
  final bool sortingEnabled;
  final bool filteringEnabled;
  final bool paginationEnabled;
  final int defaultPageSize;
  final List<int> pageSizeOptions;
  final bool selectionEnabled;
  final List<KBulkAction<T>> bulkActions;
  final void Function(T row)? onRowTap;
  final String? emptyMessage;
  final bool loading;
  final String? errorMessage;

  const KDataTable({
    super.key,
    required this.columns,
    required this.data,
    this.sortingEnabled = true,
    this.filteringEnabled = true,
    this.paginationEnabled = true,
    this.defaultPageSize = 25,
    this.pageSizeOptions = const [10, 25, 50, 100],
    this.selectionEnabled = false,
    this.bulkActions = const [],
    this.onRowTap,
    this.emptyMessage,
    this.loading = false,
    this.errorMessage,
  });

  @override
  State<KDataTable<T>> createState() => _KDataTableState<T>();
}

class _KDataTableState<T extends KDataRow> extends State<KDataTable<T>> {
  KSortState? _sort;
  String _globalSearch = '';
  int _page = 0;
  late int _pageSize;
  final _selected = <int>{};

  @override
  void initState() {
    super.initState();
    _pageSize = widget.defaultPageSize;
  }

  List<T> get _processed {
    var rows = [...widget.data];

    if (_globalSearch.isNotEmpty) {
      final query = _globalSearch.toLowerCase();
      rows = rows.where((row) {
        return widget.columns.any((col) {
          final val = row[col.field];
          return val != null && val.toString().toLowerCase().contains(query);
        });
      }).toList();
    }

    if (_sort != null) {
      rows.sort((a, b) {
        final aVal = a[_sort!.field];
        final bVal = b[_sort!.field];
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return _sort!.direction == KSortDirection.asc ? -1 : 1;
        if (bVal == null) return _sort!.direction == KSortDirection.asc ? 1 : -1;

        int cmp;
        if (aVal is num && bVal is num) {
          cmp = aVal.compareTo(bVal);
        } else {
          cmp = aVal.toString().compareTo(bVal.toString());
        }
        return _sort!.direction == KSortDirection.asc ? cmp : -cmp;
      });
    }

    return rows;
  }

  List<T> get _paged {
    final processed = _processed;
    if (!widget.paginationEnabled) return processed;
    final start = _page * _pageSize;
    final end = (start + _pageSize).clamp(0, processed.length);
    return processed.sublist(start, end);
  }

  int get _totalCount => _processed.length;

  void _handleSort(String field) {
    setState(() {
      if (_sort?.field == field) {
        _sort = _sort!.direction == KSortDirection.asc
            ? KSortState(field: field, direction: KSortDirection.desc)
            : null;
      } else {
        _sort = KSortState(field: field, direction: KSortDirection.asc);
      }
    });
  }

  void _handleGlobalSearch(String query) {
    setState(() {
      _globalSearch = query;
      _page = 0;
    });
  }

  void _toggleSelectAll() {
    setState(() {
      if (_selected.length == _paged.length) {
        _selected.clear();
      } else {
        _selected
          ..clear()
          ..addAll(List.generate(_paged.length, (i) => _page * _pageSize + i));
      }
    });
  }

  void _toggleRow(int rowIndex) {
    setState(() {
      if (_selected.contains(rowIndex)) {
        _selected.remove(rowIndex);
      } else {
        _selected.add(rowIndex);
      }
    });
  }

  List<T> get _selectedRows {
    return _selected
        .where((i) => i < _processed.length)
        .map((i) => _processed[i])
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    return KResponsiveBuilder(
      builder: (context, breakpoint, _) {
        final isMobile = breakpoint == KBreakpoint.mobile;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (widget.filteringEnabled)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: SizedBox(
                  width: 320,
                  child: TextField(
                    decoration: const InputDecoration(
                      hintText: 'Search all columns...',
                      prefixIcon: Icon(Icons.search, size: 18),
                      isDense: true,
                    ),
                    onChanged: _handleGlobalSearch,
                  ),
                ),
              ),

            if (widget.selectionEnabled && _selected.isNotEmpty && widget.bulkActions.isNotEmpty)
              _BulkActionsBar(
                selectedCount: _selected.length,
                actions: widget.bulkActions,
                selectedRows: _selectedRows,
                onClear: () => setState(_selected.clear),
              ),

            if (widget.loading)
              const Padding(
                padding: EdgeInsets.all(32),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (widget.errorMessage != null)
              _ErrorState(message: widget.errorMessage!)
            else if (_totalCount == 0)
              _EmptyState(message: widget.emptyMessage ?? 'No data to display')
            else if (isMobile)
              _CardListBody(columns: widget.columns, rows: _paged, onRowTap: widget.onRowTap)
            else
              _DesktopTable(
                columns: widget.columns,
                rows: _paged,
                sort: _sort,
                sortingEnabled: widget.sortingEnabled,
                selectionEnabled: widget.selectionEnabled,
                selectedIndices: _selected,
                pageStartIndex: _page * _pageSize,
                onSort: _handleSort,
                onToggleRow: _toggleRow,
                onToggleSelectAll: _toggleSelectAll,
                allSelected: _selected.length >= _paged.length && _paged.isNotEmpty,
                onRowTap: widget.onRowTap,
              ),

            if (widget.paginationEnabled && _totalCount > 0)
              _Pagination(
                page: _page,
                pageSize: _pageSize,
                totalCount: _totalCount,
                pageSizeOptions: widget.pageSizeOptions,
                onPageChange: (p) => setState(() => _page = p),
                onPageSizeChange: (s) => setState(() {
                  _pageSize = s;
                  _page = 0;
                }),
              ),
          ],
        );
      },
    );
  }
}

// --- Sub-components ---

class _DesktopTable<T extends KDataRow> extends StatelessWidget {
  final List<KColumnDef<T>> columns;
  final List<T> rows;
  final KSortState? sort;
  final bool sortingEnabled;
  final bool selectionEnabled;
  final Set<int> selectedIndices;
  final int pageStartIndex;
  final void Function(String field) onSort;
  final void Function(int index) onToggleRow;
  final VoidCallback onToggleSelectAll;
  final bool allSelected;
  final void Function(T row)? onRowTap;

  const _DesktopTable({
    required this.columns,
    required this.rows,
    required this.sort,
    required this.sortingEnabled,
    required this.selectionEnabled,
    required this.selectedIndices,
    required this.pageStartIndex,
    required this.onSort,
    required this.onToggleRow,
    required this.onToggleSelectAll,
    required this.allSelected,
    required this.onRowTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: PrismColors.borderDefault),
        borderRadius: BorderRadius.circular(8),
      ),
      clipBehavior: Clip.antiAlias,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          showCheckboxColumn: selectionEnabled,
          sortColumnIndex: sort != null
              ? columns.indexWhere((c) => c.field == sort!.field).clamp(0, columns.length - 1)
              : null,
          sortAscending: sort?.direction == KSortDirection.asc,
          headingRowColor: WidgetStateProperty.all(PrismColors.surfaceElevated),
          columns: [
            for (final col in columns)
              DataColumn(
                label: Text(col.header, style: const TextStyle(fontWeight: FontWeight.w600)),
                onSort: (col.sortable && sortingEnabled)
                    ? (_, __) => onSort(col.field)
                    : null,
              ),
          ],
          rows: [
            for (var i = 0; i < rows.length; i++)
              DataRow(
                selected: selectedIndices.contains(pageStartIndex + i),
                onSelectChanged: selectionEnabled
                    ? (_) => onToggleRow(pageStartIndex + i)
                    : (onRowTap != null ? (_) => onRowTap!(rows[i]) : null),
                cells: [
                  for (final col in columns)
                    DataCell(
                      col.render != null
                          ? col.render!(rows[i][col.field], rows[i])
                          : Text((rows[i][col.field] ?? '').toString()),
                    ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

class _CardListBody<T extends KDataRow> extends StatelessWidget {
  final List<KColumnDef<T>> columns;
  final List<T> rows;
  final void Function(T row)? onRowTap;

  const _CardListBody({required this.columns, required this.rows, required this.onRowTap});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (final row in rows)
          Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: InkWell(
              onTap: onRowTap != null ? () => onRowTap!(row) : null,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (final col in columns)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Row(
                          children: [
                            Text('${col.header}: ',
                                style: const TextStyle(
                                    fontWeight: FontWeight.w500,
                                    fontSize: 12,
                                    color: PrismColors.textSecondary)),
                            Expanded(
                              child: col.render != null
                                  ? col.render!(row[col.field], row)
                                  : Text((row[col.field] ?? '').toString(),
                                      style: const TextStyle(fontSize: 14)),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _BulkActionsBar<T extends KDataRow> extends StatelessWidget {
  final int selectedCount;
  final List<KBulkAction<T>> actions;
  final List<T> selectedRows;
  final VoidCallback onClear;

  const _BulkActionsBar({
    required this.selectedCount,
    required this.actions,
    required this.selectedRows,
    required this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: PrismColors.surfaceElevated,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Text('$selectedCount selected', style: const TextStyle(fontWeight: FontWeight.w500)),
          const SizedBox(width: 16),
          for (final action in actions) ...[
            TextButton.icon(
              icon: action.icon != null ? Icon(action.icon, size: 16) : const SizedBox.shrink(),
              label: Text(action.label),
              onPressed: () => action.onExecute(selectedRows),
              style: TextButton.styleFrom(foregroundColor: action.color),
            ),
            const SizedBox(width: 4),
          ],
          const Spacer(),
          IconButton(
            icon: const Icon(Icons.close, size: 18),
            onPressed: onClear,
            tooltip: 'Clear selection',
          ),
        ],
      ),
    );
  }
}

class _Pagination extends StatelessWidget {
  final int page;
  final int pageSize;
  final int totalCount;
  final List<int> pageSizeOptions;
  final void Function(int) onPageChange;
  final void Function(int) onPageSizeChange;

  const _Pagination({
    required this.page,
    required this.pageSize,
    required this.totalCount,
    required this.pageSizeOptions,
    required this.onPageChange,
    required this.onPageSizeChange,
  });

  @override
  Widget build(BuildContext context) {
    final totalPages = (totalCount / pageSize).ceil();
    final start = page * pageSize + 1;
    final end = ((page + 1) * pageSize).clamp(0, totalCount);

    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Row(
        children: [
          Text('Rows per page: ', style: TextStyle(color: PrismColors.textSecondary, fontSize: 13)),
          DropdownButton<int>(
            value: pageSize,
            underline: const SizedBox.shrink(),
            items: [
              for (final opt in pageSizeOptions)
                DropdownMenuItem(value: opt, child: Text('$opt')),
            ],
            onChanged: (v) {
              if (v != null) onPageSizeChange(v);
            },
          ),
          const Spacer(),
          Text('$start–$end of $totalCount', style: const TextStyle(fontSize: 13)),
          IconButton(
            icon: const Icon(Icons.chevron_left),
            onPressed: page > 0 ? () => onPageChange(page - 1) : null,
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            onPressed: page < totalPages - 1 ? () => onPageChange(page + 1) : null,
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final String message;
  const _EmptyState({required this.message});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(48),
      child: Center(
        child: Column(
          children: [
            const Icon(Icons.inbox_outlined, size: 48, color: PrismColors.textDisabled),
            const SizedBox(height: 12),
            Text(message, style: const TextStyle(color: PrismColors.textSecondary, fontSize: 14)),
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  const _ErrorState({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Color(0xFFFEF2F2),
        border: Border.all(color: PrismColors.statusError),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: PrismColors.statusError),
          const SizedBox(width: 12),
          Expanded(child: Text(message, style: const TextStyle(color: PrismColors.statusError))),
        ],
      ),
    );
  }
}
