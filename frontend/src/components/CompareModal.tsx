import { Modal, Table, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { pricelistsApi } from '../api/pricelists';

interface CompareModalProps {
  article: string | null;
  onClose: () => void;
}

export default function CompareModal({ article, onClose }: CompareModalProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['compare', article],
    queryFn: () => pricelistsApi.globalPositions({ article: article! }),
    enabled: !!article,
    select: (res) => res.data.results,
  });

  const columns = [
    { title: 'Поставщик', dataIndex: 'supplier_name', key: 'supplier_name', render: (text: string) => <strong>{text}</strong> },
    { title: 'Наименование у поставщика', dataIndex: 'name', key: 'name' },
    { title: 'Цена', dataIndex: 'price', key: 'price', render: (text: number) => <Typography.Text type="success" strong>{text}</Typography.Text> },
    { title: 'Ед. изм.', dataIndex: 'unit', key: 'unit' },
  ];

  return (
    <Modal
      title={<>Сравнение цен конкурентов по артикулу: <Typography.Text type="secondary">{article}</Typography.Text></>}
      open={!!article}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={isLoading}
        pagination={false}
      />
    </Modal>
  );
}
