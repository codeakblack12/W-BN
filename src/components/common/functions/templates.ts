import * as JsBarcode from 'jsbarcode';
import { formatMoney } from './common';
import moment from 'moment';

export function receiptHeader(){
    return `
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Receipt</title>
            <link href="https://fonts.cdnfonts.com/css/satoshi" rel="stylesheet">
            <style>
                * {
                    margin: 0;
                }

                body {
                    font-family: 'Satoshi', sans-serif;
                    display: flex;
                    font-size: 16px;
                    /* align-items: center; */
                    justify-content: center;
                    background: #5f56f7;
                    color: #333333;
                    padding: 0px 0px;
                }

                main {
                    background: #fff;
                    border-radius: 12px;
                    /* max-width: 950px; */
                    padding: 32px 28px;
                }

                header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                h1 {
                    font-size: 24px;
                    font-weight: 700;
                    margin-bottom: 15px;
                }

                .info-section {
                    width: 100%;
                    display: flex;
                    gap: 50px;
                    justify-content: space-between;
                    font-size: 14px;
                    font-weight: 500;
                }

                .info {
                    display: grid;
                    grid-template-columns: 115px auto;
                    margin-bottom: 13px;
                }

                .table-section {
                    border-radius: 12px;
                    border: 1px solid #EAEAEA;
                    padding: 32px 32px 0 32px;
                    margin: 7px 0 24px 0;
                }

                h4 {
                    font-weight: 700;
                    margin-bottom: 16px;
                }

                table {
                    width: 100%;
                    font-size: 15px;
                    border-collapse: collapse;
                }

                tr {
                    border-bottom: 1px solid #eaeaea;
                }

                th,
                td {
                    padding: 12px 0;
                    text-align: justify;
                }

                th:last-child,
                td:last-child {
                    text-align: right;
                    width: 120px;
                }

                th:nth-child(2),
                td:nth-child(2) {
                    border-left: 1px solid #eaeaea;
                    border-right: 1px solid #eaeaea;
                    text-align: center;
                }

                tr:last-child td {
                    border-bottom: none;
                    padding-bottom: 30px;
                }

                hr {
                    align-self: stretch;
                    border: 1px solid #EAEAEA;
                    margin: 12px 0;
                }

                .total-section {
                    padding: 0 35px;
                }

                .sub-total,
                .total {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .sub-total p {
                    font-weight: 500;
                }

                .total p {
                    font-size: 20px;
                    font-weight: 700;
                }

                .amount {
                    font-weight: 700;
                }

                @media screen and (min-width: 320px) and (max-width: 1023px) {
                    body {
                        padding: 0;

                    }

                    main {
                        padding: 24px;
                        width: 100%;
                        border-radius: 0;
                    }

                    .info-section {
                        flex-direction: column;
                        gap: 0px;
                        font-size: 12px;
                    }

                    table {
                        font-size: 13px;
                    }

                    .sub-total p {
                        font-size: 14px;
                    }

                    .total p {
                        font-size: 16px;
                    }

                }
            </style>
        </head>
    `
}

export function receiptBody(summary, handler, cart, location, barcode, date){
    return`
        <body>
            <main>
                ${recieptBodyHeader()}
                ${receiptDetails(summary, handler, cart, location, date)}
                ${receiptItemTable(summary?.items, summary?.currency)}
                ${receiptTotal(summary)}
                ${Barcode(barcode)}
            </main>
        </body>
    `
}

function recieptBodyHeader(){
    return`
        <header>
            <h1>Transaction Receipt</h1>
            <div  class="">
				<!-- logo -->
                <img style="border-radius: 50px; object-fit: cover;" height="55" width="55" src=${logo} alt="">
			</div>
        </header>
    `
}

function receiptDetails(summary, handler, cart, location, date){
    return`
        <section style="padding-top: 30px;" class="info-section">
            <div class="">
                <p class="info">
                    <span>Date & Time:</span>
                    <span>${date}</span>
                </p>

                <p class="info">
                    <span>Cashier:</span>
                    <span>${handler.firstName} ${handler.lastName}</span>
                </p>
            </div>
            <div class="">
				<p class="info">
					<span>Payment Method:</span>
					<span>${cart.payment_type}</span>
				</p>

				<p class="info">
					<span>Sales Location:</span>
					<span>${location}</span>
				</p>
			</div>
        </section>
    `
}

function receiptItemTable(items, currency){
    return`
        <section class="table-section">
            <h4>Transaction details</h4>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Items</th>
                            <th>Qty</th>
                            <th>Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${
                            items.map((val) => {
                                return(
                                    `<tr>
                                        <td>${val?.category}</td>
                                        <td>${val?.quantity}</td>
                                        <td>${formatMoney(val?.price, currency)}</td>
                                    </tr>`
                                )
                            })
                        }
                    </tbody>
                </table>
            </div>
        </section>
    `
}

function receiptTotal(summary){
    return`
        <section class="total-section">
            <div class="sub-total">
                <p>Subtotal</p>
                <p class="amount">${formatMoney(summary?.subtotal, summary?.currency)}</p>
            </div>
            <hr>
            <div class="sub-total">
                <p>NHIL/GETFD/COVID (${Math.round(summary?.covidVatValue * 10) / 10 || "0"}%)</p>
                <p class="amount">${formatMoney(summary?.covidVat || 0, summary?.currency)}</p>
            </div>
            <hr>
            <div class="sub-total">
                <p>VAT(${Math.round(summary?.vatValue * 10) / 10 || "0"}%)</p>
                <p class="amount">${formatMoney(summary?.vat || 0, summary?.currency)}</p>
            </div>
            <hr>
            <div class="total">
				<p>Total</p>
				<p class="amount">${formatMoney(summary?.total, summary?.currency)}</p>
			</div>
            <hr>
        </section>
    `
}

function Barcode(barcode){
    return`
    <div class="">
        <!-- Barcode -->
        <img height="130" style="width: 100%; height: 130px; object-fit: cover;" src=${barcode} alt="">
    </div>
    `
}

function Barcode_(){
    return`
    <div class="">
        <svg class="barcode"
            jsbarcode-format="upc"
            jsbarcode-value="123456789012"
            jsbarcode-textmargin="0"
            jsbarcode-fontoptions="bold">
        </svg>
    </div>
    `
}

const logo = "data:image/png;base64,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"