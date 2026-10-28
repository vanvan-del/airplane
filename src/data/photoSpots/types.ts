/** 一个拍照机位：在哪儿站、拍什么、什么时候拍、怎么拍 */
export interface PhotoSpot {
  name: string;
  /** 拍的是什么 */
  subject: string;
  /** 站位坐标（导航的目的地），WGS84 经纬度 */
  at: [number, number];
  /** 被拍地标的坐标，用来画机位图里的方向；拍的就是脚下的场景时没有 */
  target?: [number, number];
  /** 最佳拍摄时间 */
  time: string;
  /** 用什么焦段 */
  lens: string;
  /** 构图和姿势建议 */
  how: string;
}

/** 机位：名称、拍什么、站位纬度、站位经度、地标纬度、地标经度（没有就填 0）、时间、焦段、怎么拍 */
export function p(
  name: string,
  subject: string,
  lat: number,
  lon: number,
  tLat: number,
  tLon: number,
  time: string,
  lens: string,
  how: string,
): PhotoSpot {
  return { name, subject, at: [lat, lon], target: tLat ? [tLat, tLon] : undefined, time, lens, how };
}
