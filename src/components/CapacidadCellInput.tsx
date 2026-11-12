import React, { useState, useRef } from 'react';

interface Props {
  value: string;
  onSave: (val: string) => void;
}

const CapacidadCellInput: React.FC<Props> = ({ value, onSave }) => {
  const [localValue, setLocalValue] = useState(value);
  const prevProp = useRef(value);

  // Si el valor externo cambia (por ejemplo, después de guardar), actualiza el local
  React.useEffect(() => {
    if (prevProp.current !== value) {
      setLocalValue(value);
      prevProp.current = value;
    }
  }, [value]);

  return (
    <input
      type="text"
      pattern="[0-9]+"
      required
      inputMode="numeric"
      aria-label="Capacidad en unidades"
      value={localValue}
      onChange={e => {
        e.currentTarget.setCustomValidity('')
        setLocalValue(e.target.value)
      }}
      onBlur={e => {
        const valid = /^\d+$/.test(localValue) && Number.isSafeInteger(Number(localValue)) && Number(localValue) > 0
        e.currentTarget.setCustomValidity(valid ? '' : 'Ingresa una capacidad entera mayor que cero.')
        if (valid) onSave(localValue)
        else e.currentTarget.reportValidity()
      }}
      className="table-select"
      placeholder="Capacidad"
    />
  );
};

export default CapacidadCellInput;