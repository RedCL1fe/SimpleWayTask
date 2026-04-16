import { Table } from 'antd';
import type { PreviewData } from '../types';

interface PreviewTableProps {
  data: PreviewData;
  loading?: boolean;
}

export default function PreviewTable({ data, loading }: PreviewTableProps) {
  const columns = data.columns.map((col, idx) => ({
    title: col,
    dataIndex: `col_${idx}`,
    key: `col_${idx}`,
    ellipsis: true,
    width: 160,
  }));

  const dataSource = data.rows.map((row, rowIdx) => {
    const record: Record<string, string | number> = { key: rowIdx };
    row.forEach((cell, colIdx) => {
      record[`col_${colIdx}`] = cell;
    });
    return record;
  });

  return (
    <div className="preview-table-wrapper">
      <Table
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        pagination={false}
        scroll={{ x: 'max-content', y: 360 }}
        size="small"
        bordered
      />
    </div>
  );
}
