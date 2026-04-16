import { Tag } from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';

interface ConfidenceBadgeProps {
  confidence: number | null;
  matchType: 'none' | 'auto' | 'manual';
}

export default function ConfidenceBadge({ confidence, matchType }: ConfidenceBadgeProps) {
  if (matchType === 'none' || confidence === null) {
    return (
      <span className="confidence-badge confidence-none">
        <MinusCircleOutlined /> Нет
      </span>
    );
  }

  if (matchType === 'manual') {
    return (
      <span className="confidence-badge confidence-high">
        <CheckCircleOutlined /> Вручную
      </span>
    );
  }

  const percent = Math.round(confidence * 100);

  if (confidence >= 0.8) {
    return (
      <span className="confidence-badge confidence-high">
        <CheckCircleOutlined /> {percent}%
      </span>
    );
  }

  if (confidence >= 0.5) {
    return (
      <span className="confidence-badge confidence-medium">
        <WarningOutlined /> {percent}%
      </span>
    );
  }

  return (
    <span className="confidence-badge confidence-low">
      <CloseCircleOutlined /> {percent}%
    </span>
  );
}
