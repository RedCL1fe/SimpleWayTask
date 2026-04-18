import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Card, Select, Button, Space, Table, Tag, App, Typography, Empty, Tabs,
} from 'antd';
import { FileExcelOutlined, UploadOutlined, DatabaseOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { suppliersApi } from '../api/suppliers';
import { pricelistsApi } from '../api/pricelists';
import UploadWizard from '../components/UploadWizard';
import PositionsTable from '../components/PositionsTable';
import CompareModal from '../components/CompareModal';
import type { Supplier, PriceList } from '../types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const pricelistFields = [
  { key: 'article', label: 'Артикул', required: true },
  { key: 'name', label: 'Наименование', required: true },
  { key: 'price', label: 'Цена', required: true },
  { key: 'currency', label: 'Валюта', required: true },
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
  const [searchParams, setSearchParams] = useSearchParams();
  
  const initialSupplier = searchParams.get('supplier') ? Number(searchParams.get('supplier')) : null;
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(initialSupplier);
  const [showWizard, setShowWizard] = useState(!!initialSupplier);
  const [initialPricelistId, setInitialPricelistId] = useState<number | undefined>();

  
  const [compareArticle, setCompareArticle] = useState<string | null>(null);

  // Очистка параметра URL при закрытии wizard, чтобы при возврате не открывался снова
  const handleCloseWizard = () => {
    setShowWizard(false);
    setInitialPricelistId(undefined);
    if (searchParams.has('supplier')) {
        searchParams.delete('supplier');
        setSearchParams(searchParams);
    }
  };

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
    setInitialPricelistId(undefined);
    queryClient.invalidateQueries({ queryKey: ['pricelists'] });
    queryClient.invalidateQueries({ queryKey: ['globalPositions'] });
    message.success('Прайс-лист обработан!');
  };

  const fileColumns = [
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
    {
      title: 'Действия',
      key: 'actions',
      width: 180,
      render: (_: any, record: PriceList) => (
        <Space>
          {['uploaded', 'error'].includes(record.status) && (
            <Button
              type="primary"
              size="small"
              onClick={() => {
                setInitialPricelistId(record.id);
                setShowWizard(true);
              }}
            >
              Продолжить
            </Button>
          )}
          <Button
            danger
            size="small"
            onClick={async () => {
              try {
                await pricelistsApi.delete(record.id);
                queryClient.invalidateQueries({ queryKey: ['pricelists'] });
                message.success('Файл удален');
              } catch (err) {
                message.error('Ошибка при удалении');
              }
            }}
          >
            Удалить
          </Button>
        </Space>
      ),
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
          onClick={handleCloseWizard}
          style={{ marginBottom: 16 }}
        >
          ← Назад к списку
        </Button>
        <UploadWizard
          initialPricelistId={initialPricelistId}
          fields={pricelistFields}
          onUpload={async (file) => {
            const res = await pricelistsApi.upload(selectedSupplier, file);
            return res.data.id;
          }}
          onPreview={async (id, startRow, startCol) => {
            const res = await pricelistsApi.preview(id, startRow, startCol);
            return res.data;
          }}
          onParse={async (id, mapping, startRow, startCol) => {
            await pricelistsApi.parse(id, mapping, startRow, startCol);
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

  const handleSupplierChange = (val: number | null) => {
    setSelectedSupplier(val);
    if (!val && searchParams.has('supplier')) {
       searchParams.delete('supplier');
       setSearchParams(searchParams);
    }
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Прайс-листы</h1>
        <p>Глобальная база товаров и управление загрузками файлов от поставщиков</p>
      </div>

      <Card className="content-card">
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Space align="center">
            <span style={{ fontWeight: 500 }}>Поставщик:</span>
            <Select
                style={{ width: 320 }}
                placeholder="Все поставщики"
                value={selectedSupplier}
                onChange={handleSupplierChange}
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
          </Space>
        </Space>

        <Tabs 
           defaultActiveKey="items" 
           items={[
             {
               key: 'items',
               label: <span><DatabaseOutlined /> Товары</span>,
               children: <PositionsTable supplier={selectedSupplier} onCompare={setCompareArticle} />
             },
             {
               key: 'uploads',
               label: <span><CloudUploadOutlined /> Загрузки</span>,
               children: (
                 <div style={{ marginTop: 16 }}>
                    <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'flex-end' }}>
                        <Button
                            type="primary"
                            icon={<UploadOutlined />}
                            onClick={() => {
                                if (!selectedSupplier) {
                                    message.warning('Сперва выберите поставщика слева сверху!');
                                } else {
                                    setShowWizard(true);
                                }
                            }}
                            style={{ borderRadius: 10 }}
                        >
                            Новая загрузка
                        </Button>
                    </Space>
                    {!selectedSupplier ? (
                    <Empty
                        description="Выберите поставщика для просмотра истории загрузок файлов"
                        style={{ padding: '60px 0' }}
                    />
                    ) : (
                    <Table
                        columns={fileColumns}
                        dataSource={pricelistsData?.results}
                        rowKey="id"
                        loading={isLoading}
                        pagination={false}
                    />
                    )}
                 </div>
               )
             }
           ]}
        />
      </Card>
      
      <CompareModal article={compareArticle} onClose={() => setCompareArticle(null)} />
    </div>
  );
}
