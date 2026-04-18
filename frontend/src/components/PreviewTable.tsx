import { Table } from 'antd';
import type { PreviewData } from '../types';

interface PreviewTableProps {
  data: PreviewData;
  loading?: boolean;
  startRow: number;
  startColumn: number;
}

export default function PreviewTable({ data, loading, startRow, startColumn }: PreviewTableProps) {
  const columns = data.columns.map((col, idx) => {
    const colNumber = idx + 1;
    const isExcluded = colNumber < startColumn;
    
    return {
      title: (
        <div style={{ color: isExcluded ? '#94a3b8' : 'inherit' }}>
          {col}
        </div>
      ),
      dataIndex: `col_${idx}`,
      key: `col_${idx}`,
      ellipsis: true,
      width: 160,
      onCell: (record: any, rowIndex?: number) => {
        const absoluteRow = data.preview_start_row + (rowIndex || 0);
        const isActive = absoluteRow >= startRow && colNumber >= startColumn;
        
        return {
          style: {
            backgroundColor: isActive ? '#f0fdf4' : '#f8fafc',
            color: isActive ? '#0f172a' : '#94a3b8',
            borderLeft: (colNumber === startColumn && isActive) ? '2px solid #22c55e' : undefined,
            borderTop: (absoluteRow === startRow && isActive) ? '2px solid #22c55e' : undefined,
            transition: 'all 0.2s',
          }
        };
      }
    };
  });

  const dataSource = data.rows.map((row, rowIdx) => {
    const record: Record<string, string | number> = { 
      key: rowIdx,
      _absoluteRow: data.preview_start_row + rowIdx 
    };
    row.forEach((cell, colIdx) => {
      record[`col_${colIdx}`] = cell;
    });
    return record;
  });

  return (
    <div className="preview-table-wrapper" style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      <Table
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        pagination={false}
        scroll={{ x: 'max-content', y: 400 }}
        size="small"
        bordered
      />
    </div>
  );
}
