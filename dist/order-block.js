/*
 * Adapted from Volumized Order Blocks | Flux Charts, © fluxchart.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. A copy is available at https://mozilla.org/MPL/2.0/.
 */

function mergeOrderBlocks(zones, lastTime) {
  const end = zone => zone.breakTime ?? lastTime
  for (let i = 0; i < zones.length; i++) {
    const first = zones[i]
    const j = zones.findIndex((other,index) => index > i && first.bullish === other.bullish &&
      Math.min(end(first),end(other)) > Math.max(first.start,other.start) &&
      Math.min(first.top,other.top) > Math.max(first.bottom,other.bottom))
    if (j === -1) continue
    const second = zones[j]
    zones.splice(j,1)
    zones.splice(i,1)
    zones.unshift({
      bullish:first.bullish, start:Math.min(first.start,second.start),
      top:Math.max(first.top,second.top), bottom:Math.min(first.bottom,second.bottom),
      topVolume:first.topVolume+second.topVolume, bottomVolume:first.bottomVolume+second.bottomVolume,
      breakTime:Math.max(first.breakTime ?? 0,second.breakTime ?? 0) || null,
      combined:true
    })
    i = -1
  }
  return zones
}

function calculateOrderBlocks(rows, timestamp) {
  const swingLength = 10
  const bullish = []
  const bearish = []
  let swingType = 0
  let swingHigh
  let swingLow
  let atr = 0
  const startIndex = Math.max(swingLength, rows.length-1750)
  let lastTime = 0

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]
    if (row.closeTime >= timestamp) break
    lastTime = row.time+1
    const prior = rows[index-1]
    const trueRange = prior
      ? Math.max(row.high-row.low,Math.abs(row.high-prior.close),Math.abs(row.low-prior.close))
      : row.high-row.low
    atr = index < 10 ? atr+trueRange/10 : (atr*9+trueRange)/10
    if (index < startIndex) continue

    const candidateIndex = index-swingLength
    const candidate = rows[candidateIndex]
    const recent = rows.slice(candidateIndex+1,index+1)
    const nextType = recent.every(bar => candidate.high > bar.high) ? 0
      : recent.every(bar => candidate.low < bar.low) ? 1 : swingType
    if (nextType !== swingType) {
      if (nextType === 0) swingHigh = {index:candidateIndex, price:candidate.high}
      else swingLow = {index:candidateIndex, price:candidate.low}
      swingType = nextType
    }

    for (const [isBull, zones, swing] of [[true,bullish,swingHigh],[false,bearish,swingLow]]) {
      for (let i = zones.length-1; i >= 0; i--) {
        const zone = zones[i]
        if (zone.breakTime === null) {
          if (isBull ? row.low < zone.bottom : row.high > zone.top) zone.breakTime = row.time
        } else if (isBull ? row.high > zone.top : row.low < zone.bottom) {
          zones.splice(i,1)
        }
      }
      if (!swing || swing.crossed || !(isBull ? row.close > swing.price : row.close < swing.price)) continue
      swing.crossed = true
      let anchor = prior
      for (let i = index-2; i > swing.index; i--) {
        const bar = rows[i]
        if (isBull ? bar.low <= anchor.low : bar.high >= anchor.high) anchor = bar
      }
      if (anchor.high-anchor.low > atr*3.5) continue
      const breakoutVolume = row.volume+prior.volume
      const earlierVolume = rows[index-2].volume
      zones.unshift({
        bullish:isBull, start:anchor.time, top:anchor.high, bottom:anchor.low, breakTime:null,
        topVolume:isBull ? breakoutVolume : earlierVolume,
        bottomVolume:isBull ? earlierVolume : breakoutVolume
      })
      if (zones.length > 30) zones.pop()
    }
  }
  return mergeOrderBlocks([...bearish.slice(0,3).reverse(),...bullish.slice(0,3).reverse()],lastTime)
}

function drawOrderBlocks(ctx, zones, rows, plot, step, y, interval, formatVolume) {
  const first = rows[0]
  const duration = first.closeTime-first.time+1
  const x = time => plot.left+step*((time-first.time)/duration+0.5)
  ctx.save()
  ctx.beginPath()
  ctx.rect(plot.left,plot.top,plot.right-plot.left,plot.bottom-plot.top)
  ctx.clip()
  for (const zone of zones) {
    const start = x(zone.start)
    const end = zone.breakTime === null ? plot.right : Math.min(plot.right,x(zone.breakTime))
    const top = y(zone.top)
    const bottom = y(zone.bottom)
    if (end <= Math.max(plot.left,start) || bottom <= plot.top || top >= plot.bottom) continue
    const width = end-start
    const height = bottom-top
    const middle = top+height/2
    ctx.fillStyle = zone.bullish
      ? (zone.combined ? '#08998145' : '#0899812e')
      : (zone.combined ? '#f2364645' : '#f236462e')
    ctx.fillRect(start,top,width,height)
    const volume = zone.topVolume+zone.bottomVolume
    if (volume > 0) {
      ctx.fillStyle = '#08998180'
      ctx.fillRect(start,top,width/3*zone.topVolume/volume,height/2)
      ctx.fillStyle = '#f2364680'
      ctx.fillRect(start,middle,width/3*zone.bottomVolume/volume,height/2)
    }
    const split = start+width/3
    ctx.strokeStyle = '#47556975'
    ctx.beginPath()
    ctx.moveTo(split,top)
    ctx.lineTo(split,bottom)
    ctx.stroke()
    ctx.setLineDash([3,3])
    ctx.beginPath()
    ctx.moveTo(start,middle)
    ctx.lineTo(split,middle)
    ctx.stroke()
    ctx.setLineDash([])
    const maxVolume = Math.max(zone.topVolume,zone.bottomVolume)
    const ratio = maxVolume ? Math.floor(Math.min(zone.topVolume,zone.bottomVolume)/maxVolume*100) : 0
    const label = formatVolume(volume)+' ('+ratio+'%) · '+interval+' OB'
    const labelLeft = Math.max(plot.left,split)
    if (height >= 13 && end-labelLeft > ctx.measureText(label).width+8) {
      ctx.fillStyle = '#334155'
      ctx.textAlign = 'center'
      ctx.fillText(label,(end+labelLeft)/2,middle+4)
      ctx.textAlign = 'start'
    }
  }
  ctx.restore()
}
