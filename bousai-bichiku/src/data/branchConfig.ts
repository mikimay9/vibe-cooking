import { BranchConfig, BranchConfigMap } from '../types';

/**
 * 支店（拠点）設定
 * 
 * 各支店の所属人数と必要備蓄日数を設定
 * 不足判定: 人数 × 必要日数 × 品目ごとの1人1日分
 */

// 共通の保管場所
const standardStorageLocations = ['支店事務所', '倉庫A', '倉庫B', '倉庫C', '倉庫D'];

export const defaultBranchConfig: BranchConfigMap = {
  '本店': {
    id: 'honten',
    name: '本店',
    headcount: 100,
    requiredDays: 3,
    storageLocations: standardStorageLocations,
  },
  '東京支店': {
    id: 'tokyo',
    name: '東京支店',
    headcount: 50,
    requiredDays: 3,
    storageLocations: standardStorageLocations,
  },
  '横浜支店': {
    id: 'yokohama',
    name: '横浜支店',
    headcount: 30,
    requiredDays: 3,
    storageLocations: standardStorageLocations,
  },
  '名古屋支店': {
    id: 'nagoya',
    name: '名古屋支店',
    headcount: 40,
    requiredDays: 3,
    storageLocations: standardStorageLocations,
  },
  '大阪支店': {
    id: 'osaka',
    name: '大阪支店',
    headcount: 60,
    requiredDays: 3,
    storageLocations: standardStorageLocations,
  },
  '神戸支店': {
    id: 'kobe',
    name: '神戸支店',
    headcount: 25,
    requiredDays: 3,
    storageLocations: standardStorageLocations,
  },
  '福岡支店': {
    id: 'fukuoka',
    name: '福岡支店',
    headcount: 35,
    requiredDays: 3,
    storageLocations: standardStorageLocations,
  },
};

/**
 * 品目カテゴリごとの1人1日あたり必要量
 * 不足判定のベース
 */
export const dailyRequirementPerPerson: Record<string, number> = {
  '水・飲料': 3,           // 3L/人/日
  '主食（米・パン）': 3,    // 3食/人/日
  '缶詰・レトルト': 2,      // 2食/人/日（おかず）
  'お菓子・栄養補助': 1,    // 1個/人/日
  '調味料': 0.5,           // 共有なので少なめ
  'その他': 1,
};

/**
 * 支店設定を取得（存在しない場合はデフォルト作成）
 */
export function getBranchConfig(
  branches: BranchConfigMap,
  branchName: string
): BranchConfig {
  if (branches[branchName]) {
    return branches[branchName];
  }
  
  return {
    id: branchName.toLowerCase().replace(/\s+/g, '-'),
    name: branchName,
    headcount: 10,
    requiredDays: 3,
    storageLocations: standardStorageLocations,
  };
}

/**
 * CSVデータから支店リストを自動抽出
 */
export function extractBranchesFromItems(
  items: { branch: string; storageLocation: string }[]
): BranchConfigMap {
  const branches: BranchConfigMap = {};
  
  items.forEach(item => {
    const branchName = item.branch;
    
    if (!branches[branchName]) {
      branches[branchName] = defaultBranchConfig[branchName] 
        ? { ...defaultBranchConfig[branchName], storageLocations: [] }
        : {
            id: branchName.toLowerCase().replace(/\s+/g, '-'),
            name: branchName,
            headcount: 10,
            requiredDays: 3,
            storageLocations: [],
          };
    }
    
    if (!branches[branchName].storageLocations.includes(item.storageLocation)) {
      branches[branchName].storageLocations.push(item.storageLocation);
    }
  });
  
  return branches;
}
