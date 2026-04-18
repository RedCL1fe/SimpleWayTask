import { useState } from 'react';
import { Table, Button, Input, Space, Tag } from 'antd';
import { SearchOutlined, BarChartOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { pricelistsApi } from '../api/pricelists';

interface PositionsTableProps {
  supplier: number | null;
  onCompare: (article: string) => void;
}

export default function PositionsTable({ supplier, onCompare }: PositionsTableProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['globalPositions', supplier, search, page],
    queryFn: () => pricelistsApi.globalPositions({ 
      page,
      search,
      ...(supplier ? { price_list__supplier: supplier } : {})
    }),
    select: (res) => res.data,
  });

  const columns = [
    { title: 'Артикул', dataIndex: 'article', key: 'article', width: 140, render: (text: string) => <strong>{text}</strong> },
    { title: 'Наименование', dataIndex: 'name', key: 'name' },
    { title: 'Цена', dataIndex: 'price', key: 'price', width: 120 },
    { title: 'Ед. изм.', dataIndex: 'unit', key: 'unit', width: 100 },
    { title: 'Поставщик', dataIndex: 'supplier_name', key: 'supplier_name', width: 200, render: (text: string) => <Tag color="blue">{text}</Tag> },
    {
      title: 'Доп. параметры',
      dataIndex: 'additional_data',
      key: 'additional_data',
      render: (data: Record<string, string>) => (
        <Space size={[0, 4]} wrap>
          {data && Object.entries(data).map(([k, v]) => (
            <Tag key={k} color="default" style={{ margin: 0, marginRight: 8, marginBottom: 4 }}>
              <span style={{ color: '#64748b' }}>{k}:</span> {v}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 140,
      render: (_: any, record: any) => (
        record.has_duplicates ? (
          <Button 
            type="primary" 
            ghost 
            size="small" 
            icon={<BarChartOutlined />}
            onClick={() => onCompare(record.article)}
            style={{ borderRadius: 6 }}
          >
            Сравнить
          </Button>
        ) : null
      ),
    },
  ];

  return (
    <div style={{ marginTop: 16 }}>
      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Поиск по артикулу или названию..."
          allowClear
          onSearch={(v) => { setSearch(v); setPage(1); }}
          style={{ width: 300 }}
          prefix={<SearchOutlined />}
        />
      </Space>
      <Table
        columns={columns}
        dataSource={data?.results}
        rowKey="id"
        loading={isLoading}
        pagination={{
            current: page,
            total: data?.count,
            pageSize: 25,
            onChange: setPage,
            showTotal: (total) => `Всего: ${total}`,
        }}
      />
    </div>
  );
}
