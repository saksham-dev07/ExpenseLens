export interface Item {
  name: string;
  amount: string;
}

export interface Receipt {
  id: string;
  merchant: string;
  currency?: string;
  total_amount: string;
  usd_total?: string;
  subtotal?: string;
  tax?: string;
  taxes?: { name: string; amount: number }[];
  discount?: string;
  tip?: string;
  date_time: string;
  category: string;
  location: string;
  bill_no: string;
  ocr_text: string;
  items: Item[];
}

export interface Stats {
  total_receipts: number;
  total_amount: number;
  average_amount: number;
}
