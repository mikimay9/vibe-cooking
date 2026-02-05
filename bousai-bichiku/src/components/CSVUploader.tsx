import { useRef } from 'react';
import { StockItem } from '../types';
import { loadCSVFromFile } from '../utils/csvParser';
import './CSVUploader.css';

interface CSVUploaderProps {
  onUpload: (items: StockItem[]) => void;
}

export function CSVUploader({ onUpload }: CSVUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const items = await loadCSVFromFile(file);
      onUpload(items);
    } catch (error) {
      console.error('CSV読み込みエラー:', error);
      alert('CSVファイルの読み込みに失敗しました。ファイル形式を確認してください。');
    }

    // リセットして同じファイルを再選択可能に
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="csv-uploader">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="csv-input"
      />
      <button className="csv-button" onClick={handleClick}>
        📁 CSVを読み込む
      </button>
      <span className="csv-hint">
        備蓄リストのCSVファイルをアップロード
      </span>
    </div>
  );
}
