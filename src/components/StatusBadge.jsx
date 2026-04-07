import { TRIP_STATUS } from '../utils/constants';

export default function StatusBadge({ status }) {
  const info = TRIP_STATUS[status];
  if (!info) return null;
  return <span className={`badge badge-${status}`}>{info.label}</span>;
}
