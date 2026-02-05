import { StockItem, RawCSVRow, FoodCategory } from '../types';

/**
 * CSVテキストをパースしてStockItem配列に変換
 */
export function parseCSV(csvText: string): StockItem[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  
  const items: StockItem[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row = mapToRawRow(headers, values);
    const item = convertToStockItem(row, i);
    if (item) items.push(item);
  }

  return items;
}

/**
 * CSV行をパース（カンマ区切り、引用符対応）
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}

/**
 * ヘッダーと値をマッピング
 */
function mapToRawRow(headers: string[], values: string[]): RawCSVRow {
  const row: Record<string, string> = {};
  
  headers.forEach((header, index) => {
    const normalizedHeader = normalizeHeader(header);
    row[normalizedHeader] = values[index] || '';
  });

  return row as unknown as RawCSVRow;
}

/**
 * ヘッダー名を正規化
 */
function normalizeHeader(header: string): string {
  const mapping: Record<string, string> = {
    // 日本語対応
    'ID': 'id',
    '商品名': 'name',
    '品目名': 'name',
    '名前': 'name',
    'カテゴリ': 'category',
    '種類': 'category',
    '数量': 'quantity',
    '個数': 'quantity',
    '単位': 'unit',
    '消費期限': 'expirationDate',
    '賞味期限': 'expirationDate',
    '期限': 'expirationDate',
    // 新しい2階層対応
    '支店': 'branch',
    '拠点': 'branch',
    '保管場所': 'storageLocation',
    '営業所': 'storageLocation',
    '倉庫': 'storageLocation',
    // 後方互換性
    '場所': 'location',
    'location': 'location',
    // その他
    '寄贈済み': 'donated',
    '寄贈': 'donated',
    '備考': 'notes',
    'メモ': 'notes',
    // 英語対応
    'id': 'id',
    'name': 'name',
    'category': 'category',
    'quantity': 'quantity',
    'unit': 'unit',
    'expirationDate': 'expirationDate',
    'expiration_date': 'expirationDate',
    'branch': 'branch',
    'storageLocation': 'storageLocation',
    'storage_location': 'storageLocation',
    'donated': 'donated',
    'notes': 'notes',
  };

  return mapping[header.trim()] || header.toLowerCase().replace(/\s+/g, '');
}

/**
 * RawCSVRowをStockItemに変換
 */
function convertToStockItem(row: RawCSVRow, rowIndex: number): StockItem | null {
  if (!row.name) return null;

  const category = normalizeCategory(row.category);
  const expirationDate = normalizeDate(row.expirationDate);
  
  // 支店と保管場所の処理（後方互換性対応）
  let branch = row.branch || '';
  let storageLocation = row.storageLocation || '';
  
  // 旧形式（location）からの変換
  if (!branch && row.location) {
    branch = row.location;
    storageLocation = 'デフォルト';
  }
  
  // デフォルト値
  if (!branch) branch = '本社';
  if (!storageLocation) storageLocation = 'デフォルト';

  return {
    id: row.id || `item-${rowIndex}`,
    name: row.name,
    category,
    quantity: parseInt(row.quantity, 10) || 1,
    unit: row.unit || '個',
    expirationDate,
    branch,
    storageLocation,
    donated: row.donated?.toLowerCase() === 'true' || row.donated === '○' || row.donated === '1',
    notes: row.notes || undefined,
    rowIndex,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * カテゴリを正規化
 */
function normalizeCategory(category: string): FoodCategory {
  const mapping: Record<string, FoodCategory> = {
    '水': '水・飲料',
    '飲料': '水・飲料',
    '水・飲料': '水・飲料',
    'ドリンク': '水・飲料',
    '米': '主食（米・パン）',
    'パン': '主食（米・パン）',
    '主食': '主食（米・パン）',
    '主食（米・パン）': '主食（米・パン）',
    '缶詰': '缶詰・レトルト',
    'レトルト': '缶詰・レトルト',
    '缶詰・レトルト': '缶詰・レトルト',
    'お菓子': 'お菓子・栄養補助',
    '栄養補助': 'お菓子・栄養補助',
    'お菓子・栄養補助': 'お菓子・栄養補助',
    '調味料': '調味料',
  };

  return mapping[category] || 'その他';
}

/**
 * 日付を正規化（YYYY-MM-DD形式に）
 */
function normalizeDate(dateStr: string): string {
  if (!dateStr) {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  }

  const patterns = [
    /(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})日?/,
    /(\d{1,2})[-/](\d{1,2})[-/](\d{4})/,
  ];

  for (const pattern of patterns) {
    const match = dateStr.match(pattern);
    if (match) {
      if (match[1].length === 4) {
        const year = match[1];
        const month = match[2].padStart(2, '0');
        const day = match[3].padStart(2, '0');
        return `${year}-${month}-${day}`;
      } else {
        const year = match[3];
        const month = match[1].padStart(2, '0');
        const day = match[2].padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
  }

  return dateStr;
}

/**
 * ファイルからCSVを読み込み
 */
export function loadCSVFromFile(file: File): Promise<StockItem[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const items = parseCSV(text);
        resolve(items);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    reader.readAsText(file, 'UTF-8');
  });
}
