import 'intl';
import "intl/locale-data/jsonp/en-US";


function truncateToDecimals(num, dec = 2) {
    const calcDec = Math.pow(10, dec);
    return Math.trunc(num * calcDec) / calcDec;
}

export function formatMoney(_amount: string, currency: string) {
    const amount = truncateToDecimals(parseFloat(_amount));

    if (currency === 'NGN') {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)?.replace(".00", "");
    }

    if (currency === 'GHS') {
      return new Intl.NumberFormat('en-GH', {
        style: 'currency',
        currency: 'GHS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount)?.replace(".00", "");
    }

    return amount

}

export function  getDateRangeArray(startDate, endDate){
  var start      = startDate.split('-');
  var end        = endDate.split('-');
  var startYear  = parseInt(start[0]);
  var endYear    = parseInt(end[0]);
  var dates      = [];

  for(var i = startYear; i <= endYear; i++){
    var endMonth = i != endYear ? 11 : parseInt(end[1]) - 1;
    var startMon = i === startYear ? parseInt(start[1])-1 : 0;
    for(var j = startMon; j <= endMonth; j = j > 12 ? j % 12 || 11 : j+1) {
      var month = j+1;
      var displayMonth = month < 10 ? '0'+month : month;
      dates.push([i, displayMonth, '01'].join('-'));
    }
  }

  return dates

}