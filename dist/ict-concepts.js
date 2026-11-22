/*
 * ICT Concepts [LuxAlgo] — browser adaptation of the user-provided Pine v5 source.
 * © LuxAlgo. Licensed under CC BY-NC-SA 4.0.
 * https://creativecommons.org/licenses/by-nc-sa/4.0/
 * Changes: JavaScript calculations and Canvas rendering for Binance OHLCV data.
 * Default inputs: Present, structure length 5, body OB length 10,
 * 2 VI, 2 liquidity zones per side, 2 FVG per side, 3 NWOG.
 * Source options disabled by default (BPR, IFVG, NDOG, Fibonacci,
 * displacement markers, Killzones, historical polarity labels) remain disabled.
 */

function ictPivot(rows, index, length, bullish) {
  const at = index-1
  if (at < length) return false
  const price = bullish ? rows[at].high : rows[at].low
  return rows.slice(at-length,at).every(row => bullish ? row.high <= price : row.low >= price) &&
    (bullish ? rows[index].high < price : rows[index].low > price)
}

function ictDisplacement(rows, index) {
  if (index < 4) return 0
  const row = rows[index]
  const body = Math.abs(row.close-row.open)
  const mean = rows.slice(index-4,index+1).reduce((sum,bar) => sum+Math.abs(bar.close-bar.open),0)/5
  const largeBody = row.high-Math.max(row.open,row.close) < body*0.36 &&
    Math.min(row.open,row.close)-row.low < body*0.36 && body > mean
  return largeBody ? Math.sign(row.close-row.open) : 0
}

function updateIctLiquidity(zones, pivots, pivot, atr, index, bullish) {
  const margin = atr/2.5
  if (!(margin > 0)) return
  const matches = []
  for (const point of pivots) {
    if (point.direction !== pivot.direction) continue
    if (bullish ? point.price > pivot.price+margin : point.price < pivot.price-margin) break
    if (point.price > pivot.price-margin && point.price < pivot.price+margin) matches.push(point)
  }
  if (matches.length <= 2) return
  const first = matches.at(-1)
  const prices = matches.map(point => point.price)
  const center = (Math.min(...prices)+Math.max(...prices))/2
  const latest = zones[0]
  if (latest?.start === first.index) {
    latest.top = center+margin
    latest.bottom = center-margin
    latest.end = index+10
  } else {
    zones.unshift({
      start:first.index, end:index+10, top:center+margin, bottom:center-margin,
      level:first.price, bullish, topBroken:false, bottomBroken:false, broken:false
    })
    zones.length = Math.min(zones.length,2)
  }
}

function updateIctOrderBlocks(zones, rows, index, swing, bullish, enabled) {
  if (!enabled) return
  const row = rows[index]
  if (swing && !swing.crossed && (bullish ? row.close > swing.price : row.close < swing.price)) {
    swing.crossed = true
    let top = bullish ? Math.min(rows[index-1].open,rows[index-1].close)
      : Math.max(rows[index-1].open,rows[index-1].close)
    let bottom = bullish ? Math.max(rows[index-1].open,rows[index-1].close)
      : Math.min(rows[index-1].open,rows[index-1].close)
    let start = index-1
    for (let at = index-1; at > swing.index; at--) {
      const bar = rows[at]
      const high = Math.max(bar.open,bar.close)
      const low = Math.min(bar.open,bar.close)
      if (bullish) {
        bottom = Math.min(low,bottom)
        if (bottom === low) {
          top = high
          start = at
        }
      } else {
        top = Math.max(high,top)
        if (top === high) {
          bottom = low
          start = at
        }
      }
    }
    zones.unshift({top,bottom,start,bullish,breaker:false})
  }
  for (let at = zones.length-1; at >= 0; at--) {
    const zone = zones[at]
    if (!zone.breaker) {
      if (bullish ? Math.min(row.open,row.close) < zone.bottom : Math.max(row.open,row.close) > zone.top) {
        zone.breaker = true
      }
    } else if (bullish ? row.close > zone.top : row.close < zone.bottom) {
      zones.splice(at,1)
    }
  }
}

function calculateIctConcepts(input) {
  const rows = input.slice(-3000)
  const pivots = []
  const structure = []
  const liquidity = {bull:[],bear:[]}
  const gaps = {bull:[],bear:[]}
  const blocks = {bull:[],bear:[]}
  const imbalances = []
  const weekly = []
  let direction = 0
  let lastMss
  let lastBos
  let swingType = 0
  let swingHigh
  let swingLow
  let friday
  let atr = 0
  let atrSeed = 0
  let previousFvg = 0
  const presentStart = rows.length-501

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]
    const prior = rows[index-1]
    const inPresent = index >= presentStart
    const trueRange = prior ? Math.max(row.high-row.low,Math.abs(row.high-prior.close),Math.abs(row.low-prior.close)) : row.high-row.low
    if (index < 10) {
      atrSeed += trueRange
      if (index === 9) atr = atrSeed/10
    } else atr = (atr*9+trueRange)/10

    for (const bullish of [true,false]) {
      if (!ictPivot(rows,index,5,bullish)) continue
      const point = {direction:bullish ? 1 : -1,index:index-1,price:bullish ? prior.high : prior.low}
      if (pivots[0]?.direction !== point.direction) pivots.unshift(point)
      else if (bullish ? point.price > pivots[0].price : point.price < pivots[0].price) pivots[0] = point
      if (pivots.length > 50) pivots.pop()
      if (inPresent) updateIctLiquidity(bullish ? liquidity.bull : liquidity.bear,pivots,point,atr,index,bullish)
    }

    const upper = pivots[pivots[2]?.direction === 1 ? 2 : 1]
    const lower = pivots[pivots[2]?.direction === -1 ? 2 : 1]
    const shift = upper?.direction === 1 && row.close > upper.price && direction < 1 ? 1
      : lower?.direction === -1 && row.close < lower.price && direction > -1 ? -1 : 0
    if (shift) {
      direction = shift
      structure.length = 0
      const pivot = shift === 1 ? upper : lower
      lastMss = pivot.price
      lastBos = undefined
      structure.push({start:pivot.index,end:index,price:pivot.price,bullish:shift === 1,label:'MSS'})
    } else {
      const pivot = direction === 1 ? upper : lower
      const breakStructure = pivot && (direction === 1 ? row.close > pivot.price : direction === -1 && row.close < pivot.price)
      if (breakStructure && pivot.price !== lastMss && pivot.price !== lastBos) {
        structure.push({start:pivot.index,end:index,price:pivot.price,bullish:direction === 1,label:'BOS'})
        lastBos = pivot.price
        if (structure.length > 401) structure.splice(1,1)
      }
    }

    if (index >= 10) {
      const candidate = rows[index-10]
      const recent = rows.slice(index-9,index+1)
      const next = recent.every(bar => candidate.high > bar.high) ? 0
        : recent.every(bar => candidate.low < bar.low) ? 1 : swingType
      if (next !== swingType) {
        if (next === 0) swingHigh = {index:index-10,price:candidate.high}
        else swingLow = {index:index-10,price:candidate.low}
        swingType = next
      }
      updateIctOrderBlocks(blocks.bull,rows,index,swingHigh,true,inPresent)
      updateIctOrderBlocks(blocks.bear,rows,index,swingLow,false,inPresent)
    }

    if (prior) {
      const max = Math.max(row.open,row.close)
      const min = Math.min(row.open,row.close)
      const priorMax = Math.max(prior.open,prior.close)
      const priorMin = Math.min(prior.open,prior.close)
      const bullVi = row.open > prior.close && prior.high > row.low && row.close > prior.close && row.open > prior.open && prior.high < min
      const bearVi = row.open < prior.close && prior.low < row.high && row.close < prior.close && row.open < prior.open && prior.low > max
      if (bullVi || bearVi) {
        imbalances.unshift({start:index-1,end:index+3,top:bullVi ? min : priorMin,bottom:bullVi ? priorMax : max,bullish:bullVi})
        imbalances.length = Math.min(imbalances.length,2)
      }
    }

    let fvgDirection = 0
    if (index >= 2 && inPresent) {
      const displacement = ictDisplacement(rows,index-1)
      const earlier = rows[index-2]
      fvgDirection = displacement === 1 && row.low > earlier.high ? 1
        : displacement === -1 && row.high < earlier.low ? -1 : 0
      if (fvgDirection) {
        const bullish = fvgDirection === 1
        const list = bullish ? gaps.bull : gaps.bear
        const top = bullish ? row.low : earlier.low
        const bottom = bullish ? earlier.high : row.high
        if (previousFvg === fvgDirection && list.length) {
          Object.assign(list[0],{start:index-2,end:index+8,top,bottom})
        } else {
          list.unshift({start:index-2,end:index,top,bottom,bullish,active:true,touched:false})
          list.length = Math.min(list.length,2)
        }
      }
    }
    previousFvg = fvgDirection
    for (const zone of [...gaps.bull,...gaps.bear]) {
      if (!zone.active) continue
      zone.end = index+8
      if (zone.bullish ? row.low < zone.top : row.high > zone.bottom) zone.touched = true
      if (zone.bullish ? row.low < zone.bottom : row.high > zone.top) {
        zone.active = false
        zone.end = index
      }
    }

    for (const zone of [...liquidity.bull,...liquidity.bear]) {
      if (zone.broken) continue
      zone.end = index+3
      if (zone.bullish ? row.close > zone.top : row.close < zone.top) zone.topBroken = true
      if (zone.bullish ? row.close > zone.bottom : row.close < zone.bottom) zone.bottomBroken = true
      if (zone.topBroken && zone.bottomBroken) {
        zone.broken = true
        zone.end = index
      }
    }

    const weekday = new Date(row.time).getUTCDay()
    if (weekday === 5) friday = {index,price:row.close}
    if (prior && Math.floor(prior.time/86400000) !== Math.floor(row.time/86400000) && weekday === 1 && friday) {
      weekly.unshift({start:friday.index,end:index,top:Math.max(friday.price,row.open),bottom:Math.min(friday.price,row.open)})
      weekly.length = Math.min(weekly.length,3)
    }
  }
  return {
    firstTime:rows[0]?.time, duration:rows[0] ? rows[0].closeTime-rows[0].time+1 : 1,
    lastIndex:rows.length-1, structure, liquidity:[...liquidity.bull,...liquidity.bear],
    gaps:[...gaps.bull,...gaps.bear], imbalances, weekly,
    blocks:[...blocks.bull.slice(0,1),...blocks.bear.slice(0,1)]
  }
}

function drawIctConcepts(ctx, state, rows, plot, step, y) {
  if (!state || !rows.length || state.firstTime == null) return
  const offset = (rows[0].time-state.firstTime)/state.duration
  const x = index => plot.left+step*(index-offset+0.5)
  const line = (start,end,price,color,dash = [],width = 1) => {
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.setLineDash(dash)
    ctx.beginPath()
    ctx.moveTo(x(start),y(price))
    ctx.lineTo(x(end),y(price))
    ctx.stroke()
  }
  const text = (label,index,price,color) => {
    const left = Math.max(plot.left+2,x(index))
    if (left > plot.right-10 || y(price) < plot.top || y(price) > plot.bottom) return
    ctx.fillStyle = color
    ctx.fillText(label,left,y(price)-3,Math.max(1,plot.right-left))
  }
  const box = (zone,end,fill,border,dash = []) => {
    const left = x(zone.start)
    const right = x(end)
    if (right < plot.left || left > plot.right) return
    const top = y(zone.top)
    const height = y(zone.bottom)-top
    ctx.fillStyle = fill
    ctx.fillRect(left,top,right-left,height)
    ctx.strokeStyle = border
    ctx.lineWidth = 1
    ctx.setLineDash(dash)
    ctx.strokeRect(left,top,right-left,height)
  }
  ctx.save()
  ctx.beginPath()
  ctx.rect(plot.left,plot.top,plot.right-plot.left,plot.bottom-plot.top)
  ctx.clip()
  ctx.font = '10px system-ui, sans-serif'
  ctx.textAlign = 'start'
  for (const zone of state.weekly) {
    box(zone,state.lastIndex+10,'transparent','#b2b5be80')
    line(zone.end,state.lastIndex+10,(zone.top+zone.bottom)/2,'#ff5252b8',[2,3])
    text('NWOG',zone.end,(zone.top+zone.bottom)/2,'#ba3939')
  }
  for (const zone of state.gaps) {
    const color = zone.bullish ? '#00a653' : '#e43c3c'
    box(zone,zone.end,zone.active ? (zone.bullish ? '#00e6761a' : '#ff52521a') : (zone.bullish ? '#8080000d' : '#ff00000d'),color,zone.active ? zone.touched ? [5,3] : [] : [1,3])
    text('FVG',zone.start,zone.top,color)
  }
  for (const zone of state.liquidity) {
    const color = zone.bullish ? '#fa451c' : '#00a9bd'
    const filled = zone.bullish ? zone.bottomBroken : zone.topBroken
    box(zone,zone.end,filled ? (zone.bullish ? '#fa451c1a' : '#1ce4fa1a') : 'transparent','transparent')
    if (!filled) line(zone.start,zone.end,zone.level,color)
    text(zone.bullish ? 'Buyside liquidity' : 'Sellside liquidity',zone.start,zone.bottom,color)
  }
  for (const zone of state.imbalances) {
    line(zone.start,zone.end,zone.bullish ? zone.bottom : zone.top,'#06b2d0')
    line(zone.start+1,zone.end,zone.bullish ? zone.top : zone.bottom,'#06b2d0')
    text('VI',zone.end,(zone.top+zone.bottom)/2,'#009bb7')
  }
  for (const zone of state.blocks) {
    const color = zone.bullish ? '#3e89fa' : '#ff3131'
    if (zone.breaker) {
      box(zone,state.lastIndex+10,zone.bullish ? '#4785f926' : '#f9ff5726','transparent')
    } else {
      const level = zone.bullish ? zone.bottom : zone.top
      line(zone.start,zone.start+10,level,color,[],2)
      text(zone.bullish ? '+OB' : '-OB',zone.start+10,level,color)
    }
  }
  for (const entry of state.structure) {
    const color = entry.bullish ? '#00e6a1' : '#e60400'
    line(entry.start,entry.end,entry.price,color,entry.label === 'BOS' ? [2,3] : [])
    text(entry.label,(entry.start+entry.end)/2,entry.price,color)
  }
  ctx.restore()
}
