import { useState } from 'react';
import {
  Card, Select, Button, Space, Table, Tag, App, Typography, Empty,
} from 'antd';
import { FileExcelOutlined, UploadOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { suppliersApi } from '../api/suppliers';
import { pricelistsApi } from '../api/pricelists';
import UploadWizard from '../components/UploadWizard';
import type { PriceList, Supplier } from '../types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const pricelistFields = [
  { key: 'article', label: 'Артикул', required: true },
  { key: 'name', label: 'Наименование', required: true },
  { key: 'price', label: 'Цена', required: true },
  { key: 'unit', label: 'Ед. изм.' },
];

const statusColors: Record<string, string> = {
  uploaded: 'default',
  processing: 'processing',
  done: 'success',
  error: 'error',
};

const statusLabels: Record<string, string> = {
  uploaded: 'Загружен',
  processing: 'В обработке',
  done: 'Готов',
  error: 'Ошибка',
};

export default function PricelistsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', '', 1],
    queryFn: () => suppliersApi.list({ page_size: 100 }),
    select: (res) => res.data.results,
  });

  const { data: pricelistsData, isLoading } = useQuery({
    queryKey: ['pricelists', selectedSupplier],
    queryFn: () => pricelistsApi.list({ supplier: selectedSupplier! }),
    enabled: !!selectedSupplier,
    select: (res) => res.data,
  });

  const handleWizardComplete = () => {
    setShowWizard(false);
    queryClient.invalidateQueries({ queryKey: ['pricelists'] });
    message.success('Прайс-лист обработан!');
  };

  const columns = [
    {
      title: 'Файл',
      dataIndex: 'original_filename',
      key: 'original_filename',
      render: (name: string) => (
        <Space>
          <FileExcelOutlined style={{ color: '#22c55e' }} />
          <strong>{name}</strong>
        </Space>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string) => (
        <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
      ),
    },
    {
      title: 'Позиций',
      dataIndex: 'positions_count',
      key: 'positions_count',
      width: 100,
    },
    {
      title: 'Дата загрузки',
      dataIndex: 'upload_date',
      key: 'upload_date',
      width: 160,
      render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
    },
  ];

  if (showWizard && selectedSupplier) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <h1>Загрузка прайс-листа</h1>
          <p>
            Поставщик:{' '}
            {suppliersData?.find((s: Supplier) => s.id === selectedSupplier)?.name}
          </p>
        </div>
        <Button
          onClick={() => setShowWizard(false)}
          style={{ marginBottom: 16 }}
        >
          ← Назад к списку
        </Button>
        <UploadWizard
          fields={pricelistFields}
          onUpload={async (file) => {
            const res = await pricelistsApi.upload(selectedSupplier, file);
            return res.data.id;
          }}
          onPreview={async (id) => {
            const res = await pricelistsApi.preview(id);
            return res.data;
          }}
          onParse={async (id, mapping) => {
            await pricelistsApi.parse(id, mapping);
          }}
          onStatus={async (id) => {
            const res = await pricelistsApi.status(id);
            return res.data;
          }}
          onComplete={handleWizardComplete}
        />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Прайс-листы</h1>
        <p>Загрузка и управление прайс-листами поставщиков</p>
      </div>

      <Card className="content-card">
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Select
            style={{ width: 320 }}
            placeholder="Выберите поставщика"
            value={selectedSupplier}
            onChange={setSelectedSupplier}
            options={suppliersData?.map((s: Supplier) => ({
              value: s.id,
              label: `${s.name} (${s.inn})`,
            }))}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            allowClear
          />
          {selectedSupplier && (
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setShowWizard(true)}
              style={{ borderRadius: 10 }}
            >
              Загрузить прайс
            </Button>
          )}
        </Space>

        {!selectedSupplier ? (
          <Empty
            description="Выберите поставщика для просмотра прайс-листов"
            style={{ padding: '60px 0' }}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={pricelistsData?.results}
            rowKey="id"
            loading={isLoading}
            pagination={false}
          />
        )}
      </Card>
    </div>
  );
}
