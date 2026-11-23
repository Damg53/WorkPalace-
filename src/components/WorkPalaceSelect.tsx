import { useMemo, useRef } from "react";
import Select, { components, type OptionProps, type SingleValueProps, type StylesConfig } from "react-select";
import "./WorkPalaceSelect.css";

export interface WorkPalaceSelectOption {
  value: string;
  label: string;
  color?: string;
}

interface WorkPalaceSelectProps {
  options: WorkPalaceSelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputId?: string;
  name?: string;
  ariaLabel?: string;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
}

function OptionRow(props: OptionProps<WorkPalaceSelectOption, false>) {
  return (
    <components.Option {...props}>
      {props.data.color && <span aria-hidden="true" style={{ width: 9, height: 9, flex: "none", borderRadius: "50%", background: props.data.color }} />}
      <span title={props.data.label} style={{ minWidth: 0, whiteSpace: "normal", overflowWrap: "anywhere", lineHeight: 1.35 }}>{props.children}</span>
      {props.isSelected && <span aria-hidden="true" style={{ marginLeft: "auto" }}>✓</span>}
    </components.Option>
  );
}

function SelectedValue(props: SingleValueProps<WorkPalaceSelectOption, false>) {
  return (
    <components.SingleValue {...props}>
      <span title={props.data.label}>{props.children}</span>
    </components.SingleValue>
  );
}

export default function WorkPalaceSelect({
  options,
  value,
  defaultValue,
  onChange,
  placeholder,
  className,
  inputId,
  name,
  ariaLabel,
  required,
  disabled,
  searchable,
}: WorkPalaceSelectProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const surface = "var(--wp-select-surface, #ffffff)";
  const border = "var(--wp-select-border, #dbdbe5)";
  const text = "var(--wp-select-text, #272a3b)";
  const muted = "var(--wp-select-muted, #70758b)";
  const accent = "var(--wp-select-accent, #596cf0)";
  const desiredMenuWidth = Math.min(360, Math.max(240, ...options.map((option) => option.label.length * 7 + 64)));
  const styles = useMemo<StylesConfig<WorkPalaceSelectOption, false>>(() => ({
    container: (base) => ({ ...base, width: "100%", minWidth: 0 }),
    control: (base, state) => ({
      ...base,
      minHeight: className?.includes("--inline") ? 34 : 42,
      borderColor: state.isFocused ? accent : border,
      borderRadius: 999,
      backgroundColor: surface,
      boxShadow: state.isFocused ? `0 0 0 3px color-mix(in srgb, ${accent} 20%, transparent)` : "none",
      color: text,
      fontSize: className?.includes("--inline") ? "0.8rem" : "0.9rem",
      "&:hover": { borderColor: accent },
    }),
    valueContainer: (base) => ({ ...base, minWidth: 0, overflow: "hidden", padding: "2px 10px" }),
    input: (base) => ({ ...base, color: text }),
    singleValue: (base) => ({ ...base, maxWidth: "100%", overflow: "hidden", color: text, textOverflow: "ellipsis", whiteSpace: "nowrap" }),
    placeholder: (base) => ({ ...base, color: muted }),
    indicatorsContainer: (base) => ({ ...base, color: muted }),
    indicatorSeparator: () => ({ display: "none" }),
    menuPortal: (base) => {
      const viewportWidth = typeof window === "undefined" ? desiredMenuWidth : window.innerWidth;
      const baseLeft = Number(base.left) || 0;
      const inlineBoundary = className?.includes("--inline") ? shellRef.current?.closest(".ad-scroll") : null;
      const bounds = (inlineBoundary instanceof HTMLElement ? inlineBoundary : shellRef.current?.parentElement)?.getBoundingClientRect();
      const minLeft = Math.max(12, bounds?.left ?? 12);
      const maxRight = Math.min(viewportWidth - 12, bounds?.right ?? viewportWidth - 12);
      const availableWidth = Math.max(0, maxRight - minLeft);
      const menuWidth = Math.min(availableWidth, Math.max(Number(base.width) || 0, desiredMenuWidth));
      return {
        ...base,
        zIndex: 110,
        width: menuWidth,
        left: Math.max(minLeft, Math.min(baseLeft, maxRight - menuWidth)),
      };
    },
    menu: (base) => ({
      ...base,
      marginTop: 6,
      width: "100%",
      overflow: "hidden",
      border: `1px solid ${border}`,
      borderRadius: 14,
      backgroundColor: surface,
      boxShadow: "0 24px 50px -16px rgba(0, 0, 0, 0.75)",
    }),
    menuList: (base) => ({ ...base, padding: 6, maxHeight: 280 }),
    option: (base, state) => ({
      ...base,
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      borderRadius: 9,
      backgroundColor: state.isSelected
        ? `color-mix(in srgb, ${accent} 20%, transparent)`
        : state.isFocused
          ? `color-mix(in srgb, ${accent} 12%, transparent)`
          : "transparent",
      color: text,
      cursor: state.isDisabled ? "not-allowed" : "pointer",
      opacity: state.isDisabled ? 0.55 : 1,
      "&:active": { backgroundColor: `color-mix(in srgb, ${accent} 20%, transparent)` },
    }),
    noOptionsMessage: (base) => ({ ...base, color: muted }),
  }), [accent, border, className, desiredMenuWidth, muted, surface, text]);
  const selected = (candidate?: string) => options.find((option) => option.value === candidate) ?? null;

  return (
    <div ref={shellRef} className={`wp-select-shell${className ? ` ${className}` : ""}`}>
      <Select<WorkPalaceSelectOption, false>
        className="wp-select"
        classNamePrefix="wp-select"
        options={options}
        value={value === undefined ? undefined : selected(value)}
        defaultValue={defaultValue === undefined ? undefined : selected(defaultValue)}
        onChange={(option) => onChange?.(option?.value ?? "")}
        placeholder={placeholder}
        inputId={inputId}
        name={name}
        aria-label={ariaLabel}
        required={required}
        isDisabled={disabled}
        isSearchable={searchable ?? options.length > 10}
        menuPortalTarget={typeof document === "undefined" ? undefined : document.body}
        menuPosition="fixed"
        menuPlacement="auto"
        components={{ Option: OptionRow, SingleValue: SelectedValue }}
        styles={styles}
      />
    </div>
  );
}
