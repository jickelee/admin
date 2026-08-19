import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

export const dynamic = "force-dynamic";

const TABLE_QUERIES = {
  users: "SELECT * FROM loan_user WHERE is_del = 0 ORDER BY create_time DESC",
  creditRecords: "SELECT * FROM loan_credit_record WHERE is_del = 0 ORDER BY user_id,create_time",
  creditBasicInfo: "SELECT * FROM loan_credit_basic_info WHERE is_del = 0 ORDER BY user_id,create_time",
  creditContacts: "SELECT * FROM loan_credit_contact WHERE is_del = 0 ORDER BY user_id,create_time",
  creditIdentity: "SELECT * FROM loan_credit_identity WHERE is_del = 0 ORDER BY user_id,create_time",
  creditChanges: "SELECT * FROM loan_credit_change_log ORDER BY user_id,create_time DESC",
  pakRegions: "SELECT code,pcode,level,name_en,name_ur FROM sys_pak_region WHERE is_del = 0",
  fieldEnums: "SELECT dict_key,val,desc_en FROM sys_field_enum WHERE is_del = 0 ORDER BY dict_key,id",
  applications: "SELECT * FROM loan_apply_order WHERE is_del = 0 ORDER BY create_time DESC",
  creditQuotas: "SELECT * FROM loan_credit_quota WHERE is_del = 0 ORDER BY create_time DESC",
  disbursements: "SELECT id,disbursement_no,apply_no,user_id,product_id,apply_amount,disbursed_amount,disbursement_channel,payment_account_id,channel_txn_no,state,fail_reason,request_time,success_time,callback_time,create_time,modify_time FROM loan_disbursement_record WHERE is_del = 0 ORDER BY create_time DESC",
  paymentAccounts: "SELECT id,user_id,institution_code,identifier_sign,state,is_snapshot,verification_time,create_time,modify_time FROM loan_payment_account WHERE is_del = 0 ORDER BY create_time DESC",
  paymentInstitutions: "SELECT * FROM loan_payment_institution WHERE is_del = 0 ORDER BY sort DESC,id",
  products: "SELECT * FROM loan_product WHERE is_del = 0 ORDER BY sort_no,id",
  termRules: "SELECT * FROM loan_product_term_rule WHERE is_del = 0 ORDER BY product_id,min_loan_amount,id",
  vouchers: "SELECT * FROM loan_voucher WHERE is_del = 0 ORDER BY create_time DESC",
  bills: "SELECT * FROM loan_voucher_bill WHERE is_del = 0 ORDER BY voucher_no,term_seq",
  couponTemplates: "SELECT * FROM loan_coupon_template WHERE is_del = 0 ORDER BY create_time DESC,id DESC",
  couponInstances: "SELECT * FROM loan_coupon_instance WHERE is_del = 0 ORDER BY create_time DESC,id DESC",
  couponLogs: "SELECT * FROM loan_coupon_log WHERE is_del = 0 ORDER BY create_time DESC,id DESC",
} as const;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing database setting: ${name}`);
  return value;
}

export async function GET() {
  let connection: mysql.Connection | undefined;
  try {
    connection = await mysql.createConnection({
      host: required("DB_HOST"),
      port: Number(process.env.DB_PORT || 3306),
      user: required("DB_USER"),
      password: Buffer.from(required("DB_PASSWORD_B64"), "base64").toString("utf8"),
      database: required("DB_NAME"),
      charset: "utf8mb4",
      connectTimeout: 10_000,
      supportBigNumbers: true,
      bigNumberStrings: true,
      decimalNumbers: true,
      dateStrings: true,
      disableEval: true,
    });

    const entries = await Promise.all(
      Object.entries(TABLE_QUERIES).map(async ([key, sql]) => {
        const [rows] = await connection!.query(sql);
        return [key, rows] as const;
      }),
    );

    return NextResponse.json(
      { source: "zariya_loan", loadedAt: new Date().toISOString(), ...Object.fromEntries(entries) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Database read failed", error);
    return NextResponse.json(
      { error: "Unable to read the test database." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    await connection?.end();
  }
}
