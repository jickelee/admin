import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";
import { isAuthenticated, SESSION_COOKIE } from "../../session";

type Entity = "paymentInstitution" | "loanProduct" | "termRule";
type Operation = "create" | "update" | "toggle" | "delete";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing database setting: ${name}`);
  return value;
}

function nullable(value: unknown) {
  return value === "" || value == null ? null : value;
}

function integer(value: unknown, name: string) {
  const result = Number(value);
  if (!Number.isInteger(result)) throw new Error(`${name} must be an integer`);
  return result;
}

function number(value: unknown, name: string) {
  const result = Number(value);
  if (!Number.isFinite(result)) throw new Error(`${name} must be a number`);
  return result;
}

function text(value: unknown, name: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} is required`);
  return value.trim();
}

async function nextId(connection: mysql.Connection, table: string) {
  const [rows] = await connection.query<mysql.RowDataPacket[]>(`SELECT COALESCE(MAX(id),0)+1 AS id FROM ${table} FOR UPDATE`);
  return Number(rows[0].id);
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ message: "登录已失效，请重新登录。" }, { status: 401 });
  }

  let body: { entity?: Entity; operation?: Operation; id?: unknown; data?: Record<string, unknown> };
  try { body = await request.json(); }
  catch { return NextResponse.json({ message: "请求内容无效。" }, { status: 400 }); }

  const { entity, operation, data = {} } = body;
  if (!entity || !operation) return NextResponse.json({ message: "缺少配置操作参数。" }, { status: 400 });
  const id = body.id == null ? null : integer(body.id, "id");
  if (operation !== "create" && !id) return NextResponse.json({ message: "缺少记录 ID。" }, { status: 400 });

  let connection: mysql.Connection | undefined;
  try {
    connection = await mysql.createConnection({
      host: required("DB_HOST"), port: Number(process.env.DB_PORT || 3306), user: required("DB_USER"),
      password: Buffer.from(required("DB_PASSWORD_B64"), "base64").toString("utf8"), database: required("DB_NAME"),
      charset: "utf8mb4", connectTimeout: 10_000, supportBigNumbers: true, bigNumberStrings: true,
      decimalNumbers: true, dateStrings: true, disableEval: true,
    });
    await connection.beginTransaction();

    if (entity === "paymentInstitution") {
      if (operation === "toggle") {
        await connection.execute("UPDATE loan_payment_institution SET selectable=IF(enabled=1,0,selectable),enabled=IF(enabled=1,0,1),modify_time=NOW() WHERE id=? AND is_del=0", [id]);
      } else {
        const values = [text(data.institutionCode,"institutionCode"),text(data.partnerName,"partnerName"),text(data.displayName,"displayName"),text(data.institutionType,"institutionType"),text(data.relatedInstitutionCode,"relatedInstitutionCode"),nullable(data.ibftImd),integer(data.directoryStatus === "ENABLED" ? 1 : 0,"enabled"),integer(data.isCustomerSelectable ? 1 : 0,"selectable"),nullable(data.logoUrl),integer(data.sort,"sort")];
        if (operation === "create") {
          const newId = await nextId(connection,"loan_payment_institution");
          await connection.execute("INSERT INTO loan_payment_institution (id,institution_code,institution_name,display_name,institution_type,related_institution_code,ibft_imd,enabled,selectable,logo,sort,is_del,create_time,modify_time) VALUES (?,?,?,?,?,?,?,?,?,?,?,0,NOW(),NOW())", [newId,...values]);
        } else if (operation === "update") {
          await connection.execute("UPDATE loan_payment_institution SET institution_code=?,institution_name=?,display_name=?,institution_type=?,related_institution_code=?,ibft_imd=?,enabled=?,selectable=?,logo=?,sort=?,modify_time=NOW() WHERE id=? AND is_del=0", [...values,id]);
        }
      }
    } else if (entity === "loanProduct") {
      if (operation === "toggle") {
        await connection.execute("UPDATE loan_product SET state=IF(state=10,-10,10),modify_time=NOW() WHERE id=? AND is_del=0", [id]);
      } else {
        const allocation = JSON.stringify(JSON.parse(String(data.repayAllocationRule || "{}")));
        const values = [text(data.productName,"productName"),integer(data.status,"state"),text(data.currency,"currency"),number(data.minLoanAmount,"minLoanAmount"),nullable(data.maxLoanAmount),nullable(data.amountStep),integer(data.minInstallmentCount,"minTerm"),nullable(data.maxInstallmentCount),integer(data.periodDays,"periodDays"),number(data.dailyInterestRate,"dailyInterestRate"),number(data.dailyServiceRate,"dailyServiceRate"),number(data.overdueRate,"overdueRate"),integer(data.coolingOffHours,"coolingOffHours"),integer(data.coolingOffFeeFree,"coolingOffFeeFree"),integer(data.earlyRepayEnabled,"enableEarlyRepay"),nullable(data.earlyRepayOpenDays),integer(data.earlySettlementEnabled,"enableEarlySettlement"),integer(data.partialRepayEnabled,"enablePartialRepay"),nullable(data.minPartialRepayAmount),allocation,nullable(data.roundingRule),nullable(data.userType),nullable(data.riskLevel),integer(data.sortNo,"sortNo"),nullable(data.remark)];
        if (operation === "create") {
          const newId = await nextId(connection,"loan_product");
          await connection.execute("INSERT INTO loan_product (id,product_name,state,currency,min_loan_amount,max_loan_amount,amount_step,min_term,max_term,period_days,daily_interest_rate,daily_service_rate,overdue_rate,cooling_off_hours,cooling_off_fee_free,enable_early_repay,early_repay_open_days,enable_early_settlement,enable_partial_repay,min_partial_repay_amount,repay_allocation_rule,rounding_type,user_tag,risk_level,sort_no,remark,is_del,create_time,modify_time) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,NOW(),NOW())", [newId,...values]);
        } else if (operation === "update") {
          await connection.execute("UPDATE loan_product SET product_name=?,state=?,currency=?,min_loan_amount=?,max_loan_amount=?,amount_step=?,min_term=?,max_term=?,period_days=?,daily_interest_rate=?,daily_service_rate=?,overdue_rate=?,cooling_off_hours=?,cooling_off_fee_free=?,enable_early_repay=?,early_repay_open_days=?,enable_early_settlement=?,enable_partial_repay=?,min_partial_repay_amount=?,repay_allocation_rule=?,rounding_type=?,user_tag=?,risk_level=?,sort_no=?,remark=?,modify_time=NOW() WHERE id=? AND is_del=0", [...values,id]);
        }
      }
    } else if (entity === "termRule") {
      if (operation === "toggle") {
        await connection.execute("UPDATE loan_product_term_rule SET enabled=IF(enabled=1,0,1),modify_time=NOW() WHERE id=? AND is_del=0", [id]);
      } else if (operation === "delete") {
        await connection.execute("UPDATE loan_product_term_rule SET is_del=UNIX_TIMESTAMP(),modify_time=NOW() WHERE id=? AND is_del=0", [id]);
      } else {
        const values = [integer(data.productId,"productId"),number(data.minAmount,"minAmount"),number(data.maxAmount,"maxAmount"),nullable(data.availableTerms),nullable(data.defaultTerm),integer(data.enabled,"enabled")];
        if (operation === "create") {
          const newId = await nextId(connection,"loan_product_term_rule");
          await connection.execute("INSERT INTO loan_product_term_rule (id,product_id,min_loan_amount,max_loan_amount,available_terms,default_term,enabled,is_del,create_time,modify_time) VALUES (?,?,?,?,?,?,?,0,NOW(),NOW())", [newId,...values]);
        } else if (operation === "update") {
          await connection.execute("UPDATE loan_product_term_rule SET product_id=?,min_loan_amount=?,max_loan_amount=?,available_terms=?,default_term=?,enabled=?,modify_time=NOW() WHERE id=? AND is_del=0", [...values,id]);
        }
      }
    } else {
      throw new Error("Unsupported configuration entity");
    }

    await connection.commit();
    return NextResponse.json({ ok: true });
  } catch (error) {
    await connection?.rollback();
    console.error("Configuration write failed", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "配置保存失败。" }, { status: 400 });
  } finally { await connection?.end(); }
}
