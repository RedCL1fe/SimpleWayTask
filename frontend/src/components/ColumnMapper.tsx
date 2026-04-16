import { Select, Card, Typography, Space, Alert } from 'antd';

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
  const handleFieldChange = (fieldKey: string, columnName: string | undefined) => {
    const newMapping = { ...mapping };
    if (columnName) {
      newMapping[fieldKey] = columnName;
    } else {
      delete newMapping[fieldKey];
    }
    onChange(newMapping);
  };

  const options = columns.map((col) => ({ label: col, value: col }));

  const allRequiredMapped = fields
    .filter((f) => f.required)
    .every((f) => mapping[f.key]);

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {!allRequiredMapped && (
        <Alert
          type="warning"
          message="Укажите соответствие для обязательных полей (отмечены *)"
          showIcon
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {fields.map((field) => (
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
            <Text strong>
              {field.label} {field.required && <Text type="danger">*</Text>}
            </Text>
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
    </Space>
  );
}
