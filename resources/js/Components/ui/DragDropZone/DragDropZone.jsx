import { UploadCloud } from 'lucide-react';
import useDragAndDrop from '../../../Hooks/useDragAndDrop';
import { classNames } from '../../../Utils/formatters';
import { useRef } from 'react';

export default function DragDropZone({
  onFilesSelected, accept, title = 'Drag & Drop files here', 
  subtitle = 'or click to browse', icon: Icon = UploadCloud,
  className = '',
}) {
  const { isDragging, handlers } = useDragAndDrop({ onDrop: onFilesSelected });
  const fileInputRef = useRef(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
    }
  };

  return (
    <div 
      className={classNames('uploader-box', isDragging && 'drag-over', className)}
      onClick={handleClick}
      {...handlers}
    >
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        style={{ display: 'none' }}
        multiple
      />
      <Icon size={48} style={{ color: 'var(--text-muted)' }} />
      <h4 style={{ margin: '0.5rem 0 0.25rem 0', color: 'var(--primary-navy)' }}>{title}</h4>
      <p>{subtitle}</p>
    </div>
  );
}
