import { CHINA_PHOTO_SPOTS } from './china';
import { WORLD_PHOTO_SPOTS } from './world';

export type { PhotoSpot } from './types';

/** 各城市的拍照机位，键是城市中文名 */
export const PHOTO_SPOTS = { ...CHINA_PHOTO_SPOTS, ...WORLD_PHOTO_SPOTS };
