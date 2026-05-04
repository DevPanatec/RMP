import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const StorageImage = ({ storageId, alt, className, style, onClick }) => {
  const url = useQuery(api.files.getUrl, storageId ? { storageId } : 'skip');
  if (!storageId) return null;
  if (url === undefined) {
    return <div className={className} style={{ ...style, background: '#e5e7eb' }} />;
  }
  if (url === null) return null;
  return <img src={url} alt={alt || ''} className={className} style={style} onClick={onClick} />;
};

export default StorageImage;
