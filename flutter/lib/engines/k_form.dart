import 'package:flutter/material.dart';
import '../theme/prism_colors.dart';
import '../theme/prism_spacing.dart';

/// KForm — Field-driven form engine with validation and conditional visibility.
/// Mirrors web Form semantics.

enum KFieldType {
  text,
  email,
  password,
  url,
  tel,
  number,
  textarea,
  dropdown,
  radio,
  checkbox,
  toggle,
  date,
}

class KOption {
  final String label;
  final Object value;
  final bool disabled;

  const KOption({required this.label, required this.value, this.disabled = false});
}

enum KConditionOperator { equals, notEquals, contains, isEmpty, isNotEmpty }

class KCondition {
  final String field;
  final KConditionOperator operator;
  final Object? value;

  const KCondition({required this.field, required this.operator, this.value});

  bool evaluate(Map<String, Object?> values) {
    final fieldValue = values[field];
    switch (operator) {
      case KConditionOperator.equals:
        return fieldValue == value;
      case KConditionOperator.notEquals:
        return fieldValue != value;
      case KConditionOperator.contains:
        if (fieldValue is String && value is String) {
          return fieldValue.contains(value as String);
        }
        return false;
      case KConditionOperator.isEmpty:
        return fieldValue == null || fieldValue.toString().isEmpty;
      case KConditionOperator.isNotEmpty:
        return fieldValue != null && fieldValue.toString().isNotEmpty;
    }
  }
}

class KValidationRule {
  final String rule;
  final Object? value;
  final String message;

  const KValidationRule({required this.rule, this.value, required this.message});
}

class KFieldDef {
  final String name;
  final KFieldType type;
  final String label;
  final String? placeholder;
  final String? helpText;
  final bool required;
  final bool disabled;
  final Object? defaultValue;
  final List<KValidationRule>? validation;
  final KCondition? visible;
  final int span;
  final String? section;
  final List<KOption>? options;
  final double? min;
  final double? max;
  final int? maxLength;

  const KFieldDef({
    required this.name,
    required this.type,
    required this.label,
    this.placeholder,
    this.helpText,
    this.required = false,
    this.disabled = false,
    this.defaultValue,
    this.validation,
    this.visible,
    this.span = 1,
    this.section,
    this.options,
    this.min,
    this.max,
    this.maxLength,
  });
}

class KSectionDef {
  final String name;
  final String title;
  final bool collapsible;
  final bool defaultCollapsed;

  const KSectionDef({
    required this.name,
    required this.title,
    this.collapsible = false,
    this.defaultCollapsed = false,
  });
}

/// KForm widget — the root form engine.
class KForm extends StatefulWidget {
  final List<KFieldDef> fields;
  final List<KSectionDef>? sections;
  final Map<String, Object?>? initialValues;
  final Future<void> Function(Map<String, Object?> values) onSubmit;
  final VoidCallback? onReset;
  final String submitLabel;
  final String resetLabel;
  final bool showReset;
  final bool twoColumn;

  const KForm({
    super.key,
    required this.fields,
    required this.onSubmit,
    this.sections,
    this.initialValues,
    this.onReset,
    this.submitLabel = 'Submit',
    this.resetLabel = 'Reset',
    this.showReset = false,
    this.twoColumn = false,
  });

  @override
  State<KForm> createState() => _KFormState();
}

class _KFormState extends State<KForm> {
  final _formKey = GlobalKey<FormState>();
  late Map<String, Object?> _values;
  final _errors = <String, String>{};
  final _collapsedSections = <String, bool>{};
  bool _submitting = false;
  String? _submitError;
  bool _submitSuccess = false;

  @override
  void initState() {
    super.initState();
    _values = {
      for (final f in widget.fields)
        f.name: widget.initialValues?[f.name] ?? f.defaultValue ?? _defaultForType(f.type),
    };
    if (widget.sections != null) {
      for (final s in widget.sections!) {
        if (s.collapsible && s.defaultCollapsed) {
          _collapsedSections[s.name] = true;
        }
      }
    }
  }

  Object? _defaultForType(KFieldType type) {
    switch (type) {
      case KFieldType.checkbox:
      case KFieldType.toggle:
        return false;
      default:
        return null;
    }
  }

  bool _isVisible(KFieldDef field) {
    if (field.visible == null) return true;
    return field.visible!.evaluate(_values);
  }

  String? _validateField(KFieldDef field, Object? value) {
    if (!_isVisible(field)) return null;

    if (field.required && (value == null || value.toString().isEmpty)) {
      return '${field.label} is required';
    }

    if (field.validation == null) return null;

    for (final rule in field.validation!) {
      switch (rule.rule) {
        case 'email':
          if (value is String && value.isNotEmpty) {
            final emailRegex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
            if (!emailRegex.hasMatch(value)) return rule.message;
          }
          break;
        case 'minLength':
          if (value is String && rule.value is int && value.length < (rule.value as int)) {
            return rule.message;
          }
          break;
        case 'maxLength':
          if (value is String && rule.value is int && value.length > (rule.value as int)) {
            return rule.message;
          }
          break;
      }
    }
    return null;
  }

  Future<void> _handleSubmit() async {
    setState(() {
      _submitError = null;
      _submitSuccess = false;
      _errors.clear();
    });

    // Validate all visible fields
    for (final field in widget.fields) {
      final error = _validateField(field, _values[field.name]);
      if (error != null) _errors[field.name] = error;
    }

    if (_errors.isNotEmpty) {
      setState(() {});
      return;
    }

    setState(() => _submitting = true);

    try {
      // Only submit visible field values
      final submissionValues = <String, Object?>{
        for (final f in widget.fields)
          if (_isVisible(f)) f.name: _values[f.name],
      };
      await widget.onSubmit(submissionValues);
      setState(() {
        _submitting = false;
        _submitSuccess = true;
      });
    } catch (e) {
      setState(() {
        _submitting = false;
        _submitError = e.toString();
      });
    }
  }

  void _handleReset() {
    setState(() {
      _values = {
        for (final f in widget.fields)
          f.name: widget.initialValues?[f.name] ?? f.defaultValue ?? _defaultForType(f.type),
      };
      _errors.clear();
      _submitError = null;
      _submitSuccess = false;
    });
    widget.onReset?.call();
  }

  @override
  Widget build(BuildContext context) {
    // Group fields by section
    final groups = <(KSectionDef?, List<KFieldDef>)>[];
    final sectionMap = <String, KSectionDef>{
      if (widget.sections != null)
        for (final s in widget.sections!) s.name: s,
    };

    String? currentSection;
    var currentGroup = <KFieldDef>[];
    for (final f in widget.fields) {
      if (!_isVisible(f)) continue;
      if (f.section != currentSection) {
        if (currentGroup.isNotEmpty) {
          groups.add((currentSection != null ? sectionMap[currentSection] : null, currentGroup));
        }
        currentSection = f.section;
        currentGroup = [f];
      } else {
        currentGroup.add(f);
      }
    }
    if (currentGroup.isNotEmpty) {
      groups.add((currentSection != null ? sectionMap[currentSection] : null, currentGroup));
    }

    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final group in groups)
            _Section(
              section: group.$1,
              collapsed: group.$1 != null && (_collapsedSections[group.$1!.name] ?? false),
              onToggle: group.$1?.collapsible == true
                  ? () => setState(() {
                        _collapsedSections[group.$1!.name] =
                            !(_collapsedSections[group.$1!.name] ?? false);
                      })
                  : null,
              child: _renderFields(group.$2),
            ),

          if (_submitError != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: _Feedback(message: _submitError!, variant: _FeedbackVariant.error),
            ),
          if (_submitSuccess)
            const Padding(
              padding: EdgeInsets.only(top: 12),
              child: _Feedback(message: 'Form submitted successfully', variant: _FeedbackVariant.success),
            ),

          Padding(
            padding: const EdgeInsets.only(top: PrismSpacing.lg),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (widget.showReset)
                  OutlinedButton(
                    onPressed: _submitting ? null : _handleReset,
                    child: Text(widget.resetLabel),
                  ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _submitting ? null : _handleSubmit,
                  child: _submitting
                      ? const SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(widget.submitLabel),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _renderFields(List<KFieldDef> fields) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final f in fields)
          Padding(
            padding: const EdgeInsets.only(bottom: PrismSpacing.md),
            child: _FieldWidget(
              field: f,
              value: _values[f.name],
              error: _errors[f.name],
              onChanged: (v) {
                setState(() {
                  _values[f.name] = v;
                  _errors.remove(f.name);
                });
              },
            ),
          ),
      ],
    );
  }
}

enum _FeedbackVariant { error, success }

class _Feedback extends StatelessWidget {
  final String message;
  final _FeedbackVariant variant;
  const _Feedback({required this.message, required this.variant});

  @override
  Widget build(BuildContext context) {
    final isError = variant == _FeedbackVariant.error;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isError ? const Color(0xFFFEF2F2) : const Color(0xFFF0FDF4),
        border: Border.all(
          color: isError ? PrismColors.statusError : PrismColors.statusSuccess,
        ),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        message,
        style: TextStyle(
          color: isError ? PrismColors.statusError : PrismColors.statusSuccess,
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final KSectionDef? section;
  final bool collapsed;
  final VoidCallback? onToggle;
  final Widget child;

  const _Section({
    required this.section,
    required this.collapsed,
    required this.onToggle,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    if (section == null) return child;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        InkWell(
          onTap: onToggle,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              children: [
                if (section!.collapsible)
                  Icon(
                    collapsed ? Icons.chevron_right : Icons.expand_more,
                    size: 20,
                  ),
                if (section!.collapsible) const SizedBox(width: 4),
                Text(
                  section!.title,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
                ),
              ],
            ),
          ),
        ),
        if (!collapsed) child,
      ],
    );
  }
}

class _FieldWidget extends StatelessWidget {
  final KFieldDef field;
  final Object? value;
  final String? error;
  final void Function(Object?) onChanged;

  const _FieldWidget({
    required this.field,
    required this.value,
    required this.error,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                field.label,
                style: const TextStyle(
                  color: PrismColors.textPrimary,
                  fontWeight: FontWeight.w500,
                  fontSize: 14,
                ),
              ),
              if (field.required)
                const Text(
                  ' *',
                  style: TextStyle(
                    color: PrismColors.statusError,
                    fontWeight: FontWeight.w500,
                    fontSize: 14,
                  ),
                ),
            ],
          ),
        ),
        _buildInput(),
        if (field.helpText != null && error == null)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              field.helpText!,
              style: const TextStyle(fontSize: 12, color: PrismColors.textSecondary),
            ),
          ),
        if (error != null)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              error!,
              style: const TextStyle(fontSize: 12, color: PrismColors.statusError),
            ),
          ),
      ],
    );
  }

  Widget _buildInput() {
    switch (field.type) {
      case KFieldType.textarea:
        return TextFormField(
          initialValue: value?.toString(),
          decoration: InputDecoration(hintText: field.placeholder, errorText: error),
          maxLines: 3,
          maxLength: field.maxLength,
          enabled: !field.disabled,
          onChanged: onChanged,
        );

      case KFieldType.dropdown:
        return DropdownButtonFormField<Object>(
          initialValue: value,
          decoration: InputDecoration(hintText: field.placeholder, errorText: error),
          items: [
            for (final opt in field.options ?? [])
              DropdownMenuItem(value: opt.value, child: Text(opt.label)),
          ],
          onChanged: field.disabled ? null : onChanged,
        );

      case KFieldType.checkbox:
        return Row(
          children: [
            Checkbox(
              value: value == true,
              onChanged: field.disabled ? null : (v) => onChanged(v ?? false),
            ),
            Expanded(child: Text(field.placeholder ?? '')),
          ],
        );

      case KFieldType.toggle:
        return Switch(
          value: value == true,
          onChanged: field.disabled ? null : onChanged,
        );

      case KFieldType.radio:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (final opt in field.options ?? [])
              RadioListTile<Object>(
                title: Text(opt.label),
                value: opt.value,
                // ignore: deprecated_member_use
                groupValue: value,
                // ignore: deprecated_member_use
                onChanged: field.disabled ? null : onChanged,
                dense: true,
                contentPadding: EdgeInsets.zero,
              ),
          ],
        );

      case KFieldType.number:
        return TextFormField(
          initialValue: value?.toString(),
          decoration: InputDecoration(hintText: field.placeholder, errorText: error),
          keyboardType: TextInputType.number,
          enabled: !field.disabled,
          onChanged: (v) => onChanged(v.isEmpty ? null : double.tryParse(v)),
        );

      case KFieldType.email:
      case KFieldType.password:
      case KFieldType.url:
      case KFieldType.tel:
      case KFieldType.text:
      default:
        return TextFormField(
          initialValue: value?.toString(),
          decoration: InputDecoration(hintText: field.placeholder, errorText: error),
          keyboardType: field.type == KFieldType.email
              ? TextInputType.emailAddress
              : field.type == KFieldType.url
                  ? TextInputType.url
                  : field.type == KFieldType.tel
                      ? TextInputType.phone
                      : TextInputType.text,
          obscureText: field.type == KFieldType.password,
          maxLength: field.maxLength,
          enabled: !field.disabled,
          onChanged: onChanged,
        );
    }
  }
}
