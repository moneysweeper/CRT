// Browser implementation of the supplied Pine VWAP default settings.
// Session anchor, HLC3, offset 0, volume-weighted standard deviation, band 1.
function calculateSessionVwap(rows, visibleCount) {
  let session
  let weight = 0
  let mean = 0
  let sumSquared = 0
  return rows.map(row => {
    const day = Math.floor(row.time/86400000)
    if (day !== session) {
      session = day
      weight = 0
      mean = 0
      sumSquared = 0
    }
    const source = (row.high+row.low+row.close)/3
    if (row.volume > 0) {
      const nextWeight = weight+row.volume
      const delta = source-mean
      const nextMean = mean+delta*row.volume/nextWeight
      sumSquared += row.volume*delta*(source-nextMean)
      mean = nextMean
      weight = nextWeight
    }
    const deviation = weight > 0 ? Math.sqrt(Math.max(0,sumSquared/weight)) : 0
    return weight > 0 ? {value:mean,upper:mean+deviation,lower:mean-deviation} : null
  }).slice(-visibleCount)
}

function drawSessionVwap(ctx, points, x, y) {
  ctx.save()
  ctx.setLineDash([])
  const valid = points.map((point,index) => ({point,index})).filter(item => item.point)
  if (!valid.length) {
    ctx.restore()
    return
  }
  ctx.beginPath()
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1
  valid.forEach(({point,index},i) => {
    if (i === 0) ctx.moveTo(x(index),y(point.value))
    else ctx.lineTo(x(index),y(point.value))
  })
  ctx.stroke()
  ctx.restore()
}
