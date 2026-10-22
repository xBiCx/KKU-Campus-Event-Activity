import { CampusLocation } from '../types';

// Campus Center positioned between northern Admin/Stadium and southern Complex/Dorm
export const CAMPUS_CENTER = {
  latitude: 17.80400,
  longitude: 102.74680,
  latitudeDelta: 0.015,
  longitudeDelta: 0.015,
};

export const CAMPUS_LOCATIONS: CampusLocation[] = [
  {
    id: 'admin_building',
    name: 'อาคารบริหาร มข. วิทยาเขตหนองคาย',
    latitude: 17.80628,
    longitude: 102.74606,
    description: 'ศูนย์กลางการบริหารและสำนักงาน คณะสหวิทยาการ',
  },
  {
    id: 'stadium_10th',
    name: 'สนามกีฬา 10 ปี วนค.',
    latitude: 17.80785,
    longitude: 102.74651,
    description: 'สนามกีฬา 10 ปี วิทยาเขตหนองคาย (ทางทิศเหนือใกล้อาคารบริหาร)',
  },
  {
    id: 'complex_canteen',
    name: 'โรงอาหาร Complex',
    latitude: 17.79924,
    longitude: 102.74786,
    description: 'ศูนย์อาหารและร้านค้านักศึกษา โรงอาหาร Complex',
  },
  {
    id: 'lecture_building',
    name: 'อาคารเรียนรวม',
    latitude: 17.80322,
    longitude: 102.74806,
    description: 'อาคารเรียนรวมหลักและ Kshop',
  },
  {
    id: 'dormitory',
    name: 'หอพักนักศึกษา',
    latitude: 17.80050,
    longitude: 102.74620,
    description: 'บริเวณโซนหอพักนักศึกษา มข. หนองคาย',
  },
  {
    id: 'aquarium',
    name: 'พิพิธภัณฑ์สัตว์น้ำจังหวัดหนองคาย',
    latitude: 17.80917,
    longitude: 102.74620,
    description: 'ศูนย์วิจัยการประมงและพิพิธภัณฑ์สัตว์น้ำ มข. หนองคาย',
  },
  {
    id: 'satit_school',
    name: 'โรงเรียนสาธิต มข. วิทยาเขตหนองคาย',
    latitude: 17.81059,
    longitude: 102.74394,
    description: 'โรงเรียนสาธิตมหาวิทยาลัยขอนแก่น วิทยาเขตหนองคาย',
  },
  {
    id: 'parking_lot',
    name: 'ลานจอดรถ อาคารเรียนรวม',
    latitude: 17.80280,
    longitude: 102.74740,
    description: 'ลานจอดรถนักศึกษา หน้าอาคารเรียนรวม',
  },
];
