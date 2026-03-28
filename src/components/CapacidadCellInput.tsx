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
      value={localValue}
      onChange={e => setLocalValue(e.target.value)}
      onBlur={() => onSave(localValue)}
      className="table-select"
      placeholder="Ej: 10 personas"
    />
  );
};

export default CapacidadCellInput;