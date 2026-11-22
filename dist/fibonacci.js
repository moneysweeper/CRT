/*
 * Adapted from Fibonacci Golden Wave | Flux Charts, © fluxchart.
 * This Source Code Form is subject to the Mozilla Public License, v. 2.0.
 * https://mozilla.org/MPL/2.0/
 * Changes: JavaScript calculations and Canvas rendering using source defaults.
 * Swing Range 20, Use Pivots false, Golden Zone 0.5–0.618, Show Area true.
 */
function calculateFibonacci(rows, visibleCount) {
  return rows.map((row,index) => {
    const window = rows.slice(Math.max(0,index-19),index+1)
    const top = Math.max(...window.map(bar => bar.high))
    const bottom = Math.min(...window.map(bar => bar.low))
    const difference = top-bottom
    return {upper:top-difference*0.5,lower:top-difference*0.618}
  }).slice(-visibleCount)
}

function drawFibonacci(ctx, points, x, y) {
  if (!points.length) return
  ctx.save()
  ctx.setLineDash([])
  ctx.beginPath()
  points.forEach((point,index) => {
    if (index === 0) ctx.moveTo(x(index),y(point.upper))
    else ctx.lineTo(x(index),y(point.upper))
  })
  for (let index = points.length-1; index >= 0; index--) ctx.lineTo(x(index),y(points[index].lower))
  ctx.closePath()
  ctx.fillStyle = 'rgba(255,235,59,0.1)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,235,59,0.2)'
  ctx.lineWidth = 1
  for (const key of ['upper','lower']) {
    ctx.beginPath()
    points.forEach((point,index) => {
      if (index === 0) ctx.moveTo(x(index),y(point[key]))
      else ctx.lineTo(x(index),y(point[key]))
    })
    ctx.stroke()
  }
  ctx.restore()
}
