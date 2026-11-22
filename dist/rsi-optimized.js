/*
 * Adapted from RSI (Kernel Optimized) | Flux Charts, © Flux Charts®.
 * Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International.
 * https://creativecommons.org/licenses/by-nc-sa/4.0/
 * Changes: JavaScript calculations, Canvas arrows, labels and dashboard.
 * Source defaults: RSI 14 (close), pivot lengths 21, Gaussian kernel,
 * bandwidth 2.71828, 100 bins (200 density points), Medium / 0.25,
 * Sum probability mode, label cooldown 8, pivot sample limit 300.
 */

function buildRsiKernel(samples) {
  if (!samples.length) return null
  const minimum = Math.min(...samples)
  const range = Math.max(...samples)-minimum
  const bandwidth = 1/2.71828
  const prefix = []
  const x = []
  let total = 0
  for (let index = 0; index < 200; index++) {
    const value = minimum+index*range/100
    let density = 0
    for (const sample of samples) {
      const distance = (value-sample)/bandwidth
      density += Math.exp(-0.5*distance*distance)/Math.sqrt(2*Math.PI)
    }
    total += density/samples.length
    x.push(value)
    prefix.push(total)
  }
  return {x,prefix,total}
}

function rsiKernelProbability(kernel, rsi, high) {
  if (!kernel || rsi === null) return null
  const {x,prefix,total} = kernel
  let left = 0
  let right = x.length
  while (left < right) {
    const middle = Math.floor((left+right)/2)
    if (x[middle] < rsi) left = middle+1
    else right = middle
  }
  const lower = Math.max(0,Math.min(x.length-1,left-1))
  let upper = Math.min(x.length-1,left)
  if (x[upper] === rsi) {
    // Match the source's rightmost-index tie choice, including zero-range KDE.
    while (upper+1 < x.length && x[upper+1] === rsi) upper++
  }
  const nearest = Math.abs(rsi-x[lower]) < Math.abs(rsi-x[upper]) ? lower : upper
  return high ? prefix[nearest] : total-(nearest > 0 ? prefix[nearest-1] : 0)
}

function isOptimizedRsiPivot(rows, at, high) {
  if (at < 21 || at+21 >= rows.length) return false
  const value = high ? rows[at].high : rows[at].low
  for (let index = at-21; index <= at+21; index++) {
    if (index === at) continue
    const other = high ? rows[index].high : rows[index].low
    if (high ? other > value || (index > at && other === value)
      : other < value || (index > at && other === value)) return false
  }
  return true
}

function calculateOptimizedRsi(input, timestamp) {
  const rows = input.slice(-5000)
  const rsi = relativeStrength(rows.map(row => row.close),14)
  const highSamples = []
  const lowSamples = []
  let highKernel = null
  let lowKernel = null
  let previousDirection = 0
  let lastBullLabel = 0
  let lastBearLabel = 0
  const markers = []
  let current = {rsi:null,highProbability:null,lowProbability:null}

  for (let index = 0; index < rows.length; index++) {
    const pivotIndex = index-21
    if (pivotIndex >= 21 && rsi[pivotIndex] !== null) {
      if (isOptimizedRsiPivot(rows,pivotIndex,true)) {
        if (highSamples.length > 300) highSamples.shift()
        highSamples.push(rsi[pivotIndex])
        highKernel = buildRsiKernel(highSamples)
      }
      if (isOptimizedRsiPivot(rows,pivotIndex,false)) {
        if (lowSamples.length > 300) lowSamples.shift()
        lowSamples.push(rsi[pivotIndex])
        lowKernel = buildRsiKernel(lowSamples)
      }
    }
    const highProbability = rsiKernelProbability(highKernel,rsi[index],true)
    const lowProbability = rsiKernelProbability(lowKernel,rsi[index],false)
    const direction = lowKernel && highKernel
      ? lowProbability > lowKernel.total*0.75 ? 1 : highProbability > highKernel.total*0.75 ? -1 : 0
      : 0
    const confirmed = rows[index].closeTime < timestamp
    if (confirmed && direction) {
      markers.push({time:rows[index].time,direction,possible:false})
    }
    if (confirmed && !direction && previousDirection) {
      const bullish = previousDirection === 1
      const lastLabel = bullish ? lastBullLabel : lastBearLabel
      const label = index-lastLabel > 8
      if (label) {
        if (bullish) lastBullLabel = index
        else lastBearLabel = index
      }
      markers.push({
        time:rows[index].time,direction:previousDirection,possible:true,label,
        rsi:rsi[index],probability:bullish ? lowProbability : highProbability
      })
    }
    current = {rsi:rsi[index],highProbability,lowProbability}
    previousDirection = direction
  }
  return {markers,current}
}

function drawOptimizedRsi(ctx, state, rows, plot, step, y) {
  if (!state || !rows.length) return
  const first = rows[0]
  const duration = first.closeTime-first.time+1
  const colors = {bull:'#089981',bear:'#f23646'}
  ctx.save()
  ctx.beginPath()
  ctx.rect(plot.left,plot.top,plot.right-plot.left,plot.bottom-plot.top)
  ctx.clip()
  ctx.font = '10px system-ui, sans-serif'
  for (const marker of state.markers) {
    const index = Math.round((marker.time-first.time)/duration)
    if (index < 0 || index >= rows.length || rows[index].time !== marker.time) continue
    const bullish = marker.direction === 1
    const color = bullish ? colors.bull : colors.bear
    const x = plot.left+step*(index+0.5)
    const priceY = y(bullish ? rows[index].low : rows[index].high)
    const tip = bullish ? Math.min(plot.bottom-22,priceY+4) : Math.max(plot.top+22,priceY-4)
    const sign = bullish ? 1 : -1
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.globalAlpha = marker.possible ? 1 : 0.3
    ctx.lineWidth = 1.5
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(x,tip+sign*20)
    ctx.lineTo(x,tip+sign*6)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x,tip)
    ctx.lineTo(x-4,tip+sign*7)
    ctx.lineTo(x+4,tip+sign*7)
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 1
    if (marker.possible && marker.label) {
      const probability = marker.probability == null ? '—' : (marker.probability*100).toFixed(2)+'%'
      const label = 'RSI | '+Math.round(marker.rsi)+' | '+probability
      const width = Math.min(plot.right-plot.left,ctx.measureText(label).width+8)
      const left = Math.max(plot.left,Math.min(x-width/2,plot.right-width))
      const top = Math.max(plot.top,Math.min(tip+sign*24-(bullish ? 0 : 15),plot.bottom-16))
      ctx.fillStyle = '#1b1f2be6'
      ctx.fillRect(left,top,width,16)
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.fillText(label,left+width/2,top+12,Math.max(1,width-6))
      ctx.textAlign = 'start'
    }
  }
  const {current} = state
  const bullish = current.lowProbability !== null && current.highProbability !== null &&
    current.lowProbability > current.highProbability
  const probability = Math.max(current.lowProbability ?? 0,current.highProbability ?? 0)
  const width = Math.min(192,plot.right-plot.left-8)
  if (width > 70) {
    const left = plot.right-width-4
    const top = plot.top+4
    ctx.fillStyle = '#1b1f2b'
    ctx.fillRect(left,top,width,61)
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1
    ctx.strokeRect(left,top,width,61)
    ctx.fillStyle = '#fff'
    ctx.fillText('KDE Optimized RSI',left+6,top+13,width-12)
    ctx.fillText('RSI',left+6,top+31)
    ctx.textAlign = 'right'
    ctx.fillText(current.rsi == null ? '—' : String(Math.round(current.rsi)),left+width-6,top+31)
    ctx.textAlign = 'start'
    ctx.fillStyle = bullish ? colors.bull : colors.bear
    ctx.fillText(bullish ? 'Bullish KDE' : 'Bearish KDE',left+6,top+49,width*0.6)
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'right'
    ctx.fillText((probability*100).toFixed(2)+'%',left+width-6,top+49,width*0.4)
  }
  ctx.restore()
}
