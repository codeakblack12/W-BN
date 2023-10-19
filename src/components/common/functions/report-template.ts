import * as JsBarcode from 'jsbarcode';
import { formatMoney } from './common';
import moment from 'moment';

export function NewDailyReportHead(date){
    return `
        <div style="padding: 18px 48px 18px 48px; background: #222B44; display: flex; justify-content: space-between; align-items: center;">
            <p style="color: #FFF; font-size: 24px; font-style: normal; font-weight: 900; line-height: normal;">
                DAILY REPORT FOR ${date?.toUpperCase()}
            </p>
        </div>
    `
}

export function DailyReportMainTable(warehouse){
    return `
        <div style="padding: 0px 23px 0px 23px;">
            <p style="color: #222B44; font-size: 18px; font-style: normal; font-weight: 700; line-height: normal; text-transform: uppercase;">
                Warehouse: ${warehouse?.name?.toUpperCase()}
            </p>
        </div>
        <div style="padding: 23px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));">
            <div style="border: #DBDBDB solid 1px;">
                ${DailyInventoryReport(warehouse)}
            </div>
            <div style="border: #DBDBDB solid 1px;">
                ${DailyTransactionReport(warehouse)}
            </div>
        </div>
    `
}

export function DailyInventoryReport(warehouse){
    return `
        <p style="padding: 16px; background: #222B44; color: white; font-size: 16px; font-style: normal; font-weight: 700; margin: 0;">
            Inventory Report
        </p>
        <table style="border-collapse: collapse; border: #DBDBDB solid 1px; width: 100%;">
            <tbody>
                <tr style="background: #EDF3FE; height: 80px;">
                    <th style="font-size: 12px; font-style: normal; border: #DBDBDB solid 1px; font-weight: 500; line-height: normal; color: #333; padding: 16px;">
                        Category
                    </th>
                    <th style="font-size: 12px; font-style: normal; border: #DBDBDB solid 1px; font-weight: 500; line-height: normal; color: #333; padding: 16px;">
                        Closing inventory yesterday
                    </th>
                    <th style="font-size: 12px; font-style: normal; border: #DBDBDB solid 1px; font-weight: 500; line-height: normal; color: #333; padding: 16px;">
                        Stock added
                    </th>
                    <th style="font-size: 12px; font-style: normal; border: #DBDBDB solid 1px; font-weight: 500; line-height: normal; color: #333; padding: 16px;">
                        Stock deleted
                    </th>
                    <th style="font-size: 12px; font-style: normal; border: #DBDBDB solid 1px; font-weight: 500; line-height: normal; color: #333; padding: 16px;">
                        Stock sold
                    </th>
                    <th style="font-size: 12px; font-style: normal; border: #DBDBDB solid 1px; font-weight: 500; line-height: normal; color: #333; padding: 16px;">
                        Today’s closing inventory
                    </th>
                </tr>
                <tr>
                    <th style="font-size: 12px; font-style: normal; border: #DBDBDB solid 1px; font-weight: 500; line-height: normal; color: #333; padding: 16px;">
                        ---
                    </th>
                    <th style="font-size: 12px; font-style: normal; border: #DBDBDB solid 1px; font-weight: 500; line-height: normal; color: #333; padding: 16px;">
                        ---
                    </th>
                    <th style="font-size: 12px; font-style: normal; border: #DBDBDB solid 1px; font-weight: 500; line-height: normal; color: #333; padding: 16px;">
                        ---
                    </th>
                    <th style="font-size: 12px; font-style: normal; border: #DBDBDB solid 1px; font-weight: 500; line-height: normal; color: #333; padding: 16px;">
                        ---
                    </th>
                    <th style="font-size: 12px; font-style: normal; border: #DBDBDB solid 1px; font-weight: 500; line-height: normal; color: #333; padding: 16px;">
                        ---
                    </th>
                    <th style="font-size: 12px; font-style: normal; border: #DBDBDB solid 1px; font-weight: 500; line-height: normal; color: #333; padding: 16px;">
                        ---
                    </th>
                </tr>
                ${
                    warehouse.categoryInfo.map((category) => {
                        return `<tr>
                            <th style="max-width: 100px; font-size: 12px; font-style: normal; border: #DBDBDB solid 1px; font-weight: 500; line-height: normal; color: #333; padding: 16px; white-space: nowrap; overflow: hidden; word-wrap: break-word;">
                                ${category.category}
                            </th>
                            <th style="font-size: 12px; font-style: normal; border: #DBDBDB solid 1px; font-weight: 500; line-height: normal; color: #333; padding: 16px;">
                                N/A
                            </th>
                            <th style="font-size: 12px; font-style: normal; border: #DBDBDB solid 1px; font-weight: 500; line-height: normal; color: #333; padding: 16px;">
                                ${category.added}
                            </th>
                            <th style="font-size: 12px; font-style: normal; border: #DBDBDB solid 1px; font-weight: 500; line-height: normal; color: #333; padding: 16px;">
                                N/A
                            </th>
                            <th style="font-size: 12px; font-style: normal; border: #DBDBDB solid 1px; font-weight: 500; line-height: normal; color: #333; padding: 16px;">
                                ${category.sold}
                            </th>
                            <th style="font-size: 12px; font-style: normal; border: #DBDBDB solid 1px; font-weight: 500; line-height: normal; color: #333; padding: 16px;">
                                ${category.total_stock}
                            </th>
                        </tr>`
                    }).join("")
                }
            </tbody>
        </table>
    `
}

export function DailyTransactionReport(warehouse){
    return `
        <p style="padding: 16px; background: #222B44; color: white; font-size: 16px; font-style: normal; font-weight: 700; margin: 0;">
            Transaction Report
        </p>
        <div style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr));">
            <div style="grid-column: span 2 / span 2;">
                <div style="color: #333; font-size: 16px; font-style: normal; font-weight: 700; line-height: normal; background: #EDF3FE; height: 80px; display: flex; justify-content: flex-start; align-items: center; padding-left: 16px;">
                    Dockyard sales
                </div>
                <table style="border-collapse: collapse; width: 100%;">
                    <tbody>
                        <tr>
                            <th style="font-size: 12px; font-style: normal; border: #DBDBDB solid 1px; font-weight: 500; line-height: normal; color: #333; padding: 16px; white-space: nowrap; overflow: hidden;">
                                Stock sold
                            </th>
                            <th style="font-size: 12px; font-style: normal; border: #DBDBDB solid 1px; font-weight: 500; line-height: normal; color: #333; padding: 16px; white-space: nowrap; overflow: hidden;">
                                Amount
                            </th>
                        </tr>
                        ${
                            warehouse.categoryInfo.map((category) => {
                                return `<tr>
                                    <th style="font-size: 12px; font-style: normal; border: #DBDBDB solid 1px; font-weight: 500; line-height: normal; color: #333; padding: 16px;">
                                        ${category.dock_sold}
                                    </th>
                                    <th style="font-size: 12px; font-style: normal; border: #DBDBDB solid 1px; font-weight: 500; line-height: normal; color: #333; padding: 16px;">
                                        ${formatMoney(category.dock_total, warehouse?.currency)}
                                    </th>
                                </tr>`
                            }).join("")
                        }
                    </tbody>
                </table>
            </div>
            <div style="grid-column: span 3 / span 3; border-left: #DBDBDB 1px solid;">
                <div style="color: #333; font-size: 16px; font-style: normal; font-weight: 700; line-height: normal; background: #EDF3FE; height: 80px; display: flex; justify-content: flex-start; align-items: center; padding-left: 16px;">
                    Warehouse Sales
                </div>
                <table style="border-collapse: collapse; width: 100%;">
                    <tbody>
                        <tr>
                            <th style="font-size: 12px; font-style: normal; border: #DBDBDB solid 1px; font-weight: 500; line-height: normal; color: #333; padding: 16px; white-space: nowrap; overflow: hidden;">
                                Stock sold
                            </th>
                            <th style="font-size: 12px; font-style: normal; border: #DBDBDB solid 1px; font-weight: 500; line-height: normal; color: #333; padding: 16px; white-space: nowrap; overflow: hidden;">
                                Amount
                            </th>
                            <th style="font-size: 12px; font-style: normal; border: #DBDBDB solid 1px; font-weight: 500; line-height: normal; color: #333; padding: 16px; white-space: nowrap; overflow: hidden;">
                                Total Sales
                            </th>
                        </tr>
                        ${
                            warehouse.categoryInfo.map((category) => {
                                return `<tr>
                                    <th style="font-size: 12px; font-style: normal; border: #DBDBDB solid 1px; font-weight: 500; line-height: normal; color: #333; padding: 16px;">
                                        ${category.sold}
                                    </th>
                                    <th style="font-size: 12px; font-style: normal; border: #DBDBDB solid 1px; font-weight: 500; line-height: normal; color: #333; padding: 16px;">
                                        ${formatMoney(category.ware_total, warehouse?.currency)}
                                    </th>
                                    <th style="font-size: 12px; font-style: normal; border: #DBDBDB solid 1px; font-weight: 500; line-height: normal; color: #333; padding: 16px;">
                                        ${formatMoney(category.ware_total + category.dock_total, warehouse?.currency)}
                                    </th>
                                </tr>`
                            }).join("")
                        }
                    </tbody>
                </table>

            </div>
        </div>
    `
}

export function DailyReportBottomTable(warehouse){
    return `
    <div style="padding: 23px; max-width: 1100px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 33;">
        <table style="border-collapse: collapse; border: #DBDBDB solid 1px; width: 100%;">
            <thead>
                <th style="color: #000; padding: 16px 16px 8px 16px; font-size: 16px; font-style: normal; font-weight: 500; line-height: normal; text-align: left; border: #DBDBDB solid 1px;">
                    Total dockyard sales
                </th>
                <th style="color: #000; padding: 16px 16px 8px 16px; font-size: 16px; font-style: normal; font-weight: 500; line-height: normal; text-align: left; border: #DBDBDB solid 1px;">
                    ${formatMoney(warehouse.total_dockyard_sales, warehouse?.currency)}
                </th>
            </thead>
            <tbody>
                <td style="color: #000; padding: 24px 16px 16px 16px; font-size: 16px; font-style: normal; font-weight: 500; line-height: normal; text-align: left; border: #DBDBDB solid 1px;">
                    Total warehouse sales
                </td>
                <td style="color: #000; padding: 24px 16px 16px 16px; font-size: 16px; font-style: normal; font-weight: 500; line-height: normal; text-align: left; border: #DBDBDB solid 1px;">
                    ${formatMoney(warehouse.total_warehouse_sales, warehouse?.currency)}
                </td>
            </tbody>
        </table>
        <table style="border-collapse: collapse; border: #DBDBDB solid 1px; width: 100%;">
            <thead>
                <th style="color: #000; padding: 16px 16px 8px 16px; font-size: 16px; font-style: normal; font-weight: 500; line-height: normal; text-align: left; border: #DBDBDB solid 1px;">
                    New user/staff
                </th>
                <th style="color: #000; padding: 16px 16px 8px 16px; font-size: 16px; font-style: normal; font-weight: 500; line-height: normal; text-align: left; border: #DBDBDB solid 1px;">
                    ${warehouse.newUsers}
                </th>
            </thead>
            <tbody>
                <td style="color: #000; padding: 24px 16px 16px 16px; font-size: 16px; font-style: normal; font-weight: 500; line-height: normal; text-align: left; border: #DBDBDB solid 1px;">
                    Updated user/staff
                </td>
                <td style="color: #000; padding: 24px 16px 16px 16px; font-size: 16px; font-style: normal; font-weight: 500; line-height: normal; text-align: left; border: #DBDBDB solid 1px;">
                    ${warehouse.updatedUsers}
                </td>
            </tbody>
        </table>
    </div>
    `
}