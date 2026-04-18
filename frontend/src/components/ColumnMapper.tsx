import { useState } from 'react';
import { Select, Card, Typography, Space, Alert, Input, Button, Form } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface ColumnMapperProps {
  columns: string[];
  fields: { key: string; label: string; required?: boolean }[];
  mapping: Record<string, string>;
  onChange: (mapping: Record<string, string>) => void;
}

export default function ColumnMapper({
  columns,
  fields,
  mapping,
  onChange,
}: ColumnMapperProps) {
  const [customFields, setCustomFields] = useState<{ key: string; label: string; required?: boolean }[]>([]);
  const [newFieldName, setNewFieldName] = useState('');

  const handleFieldChange = (fieldKey: string, columnName: string | undefined) => {
    const newMapping = { ...mapping };
    if (columnName) {
      newMapping[fieldKey] = columnName;
    } else {
      delete newMapping[fieldKey];
    }
    onChange(newMapping);
  };

  const addCustomField = () => {
    if (!newFieldName.trim()) return;
    const key = newFieldName.trim(); // use name as key for simplicity in additional_data
    if (!fields.find(f => f.key === key) && !customFields.find(f => f.key === key)) {
        setCustomFields([...customFields, { key, label: key }]);
    }
    setNewFieldName('');
  };

  const removeCustomField = (key: string) => {
    setCustomFields(customFields.filter(f => f.key !== key));
    handleFieldChange(key, undefined);
  };

  const options = columns.map((col) => ({ label: col, value: col }));

  const allRequiredMapped = fields
    .filter((f) => f.required)
    .every((f) => mapping[f.key]);

  const allDisplayedFields = [...fields, ...customFields];

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {!allRequiredMapped && (
        <Alert
          type="warning"
          message="Укажите соответствие для обязательных полей (отмечены *)"
          showIcon
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {allDisplayedFields.map((field) => (
          <Card
            key={field.key}
            size="small"
            style={{
              borderRadius: 10,
              border: field.required && !mapping[field.key]
                ? '1px solid #f59e0b'
                : '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong>
                {field.label} {field.required && <Text type="danger">*</Text>}
                </Text>
                {!fields.find(f => f.key === field.key) && (
                    <Button 
                        type="text" 
                        danger 
                        size="small" 
                        icon={<DeleteOutlined />} 
                        onClick={() => removeCustomField(field.key)}
                    />
                )}
            </div>
            
            <Select
              style={{ width: '100%', marginTop: 8 }}
              placeholder="Выберите колонку Excel"
              options={options}
              value={mapping[field.key] || undefined}
              onChange={(val) => handleFieldChange(field.key, val)}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Card>
        ))}
      </div>

      <Card size="small" style={{ borderRadius: 10, background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
        <Text strong>Добавить своё поле</Text>
        <p style={{ margin: '4px 0 12px', fontSize: 12, color: '#64748b' }}>
            Например: Количество, Срок поставки, Бренд и т.д.
        </p>
        <Space.Compact style={{ width: '100%' }}>
            <Input 
                placeholder="Название поля..." 
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                onPressEnter={addCustomField}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={addCustomField}>
                Добавить
            </Button>
        </Space.Compact>
      </Card>
    </Space>
  );
}
