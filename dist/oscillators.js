function exponentialAverage(values, length) {
  let average = null
  let sum = 0
  let count = 0
  const weight = 2/(length+1)
  return values.map(value => {
    if (value === null) return null
    if (average !== null) {
      average += (value-average)*weight
    } else {
      sum += value
      count++
      if (count === length) average = sum/length
    }
    return average
  })
}

function relativeStrength(closes, length) {
  let gain = 0
  let loss = 0
  return closes.map((close,index) => {
    if (index === 0) return null
    const difference = close-closes[index-1]
    const up = Math.max(0,difference)
    const down = Math.max(0,-difference)
    if (index <= length) {
      gain += up/length
      loss += down/length
    } else {
      gain += (up-gain)/length
      loss += (down-loss)/length
    }
    if (index < length) return null
    return gain+loss > 0 ? 100*gain/(gain+loss) : 50
  })
}

function calculateOscillators(history, visibleCount) {
  const closes = history.map(row => row.close)
  const fast = exponentialAverage(closes,12)
  const slow = exponentialAverage(closes,26)
  const macd = slow.map((value,index) => value === null ? null : fast[index]-value)
  const signal = exponentialAverage(macd,9)
  const rsi = relativeStrength(closes,14)
  return macd.map((value,index) => ({
    macd:value, signal:signal[index], rsi:rsi[index],
    histogram:signal[index] === null ? null : value-signal[index]
  })).slice(-visibleCount)
}

function strokeOscillator(ctx, values, x, y, color, key) {
  ctx.strokeStyle = color
  ctx.lineWidth = 1.4
  ctx.beginPath()
  let connected = false
  values.forEach((value,index) => {
    if (value[key] === null) {
      connected = false
      return
    }
    if (connected) ctx.lineTo(x(index),y(value[key]))
    else ctx.moveTo(x(index),y(value[key]))
    connected = true
  })
  ctx.stroke()
}

function strokeComparedOscillator(ctx, values, x, y, key, reference) {
  for (const [above,color] of [[true,'#c52636'],[false,'#2962ff']]) {
    ctx.strokeStyle = color
    ctx.lineWidth = 1.4
    ctx.beginPath()
    for (let index = 1; index < values.length; index++) {
      const previous = values[index-1]
      const current = values[index]
      if (previous[key] === null || current[key] === null) continue
      const before = previous[key]-(reference(previous) ?? previous[key])
      const after = current[key]-(reference(current) ?? current[key])
      const startsAbove = before > 0
      const endsAbove = after > 0
      if (startsAbove !== above && endsAbove !== above) continue
      const startX = x(index-1)
      const endX = x(index)
      const startY = y(previous[key])
      const endY = y(current[key])
      if (startsAbove === endsAbove) {
        ctx.moveTo(startX,startY)
        ctx.lineTo(endX,endY)
        continue
      }
      const fraction = before/(before-after)
      const crossX = startX+(endX-startX)*fraction
      const crossY = startY+(endY-startY)*fraction
      ctx.moveTo(startsAbove === above ? startX : crossX,startsAbove === above ? startY : crossY)
      ctx.lineTo(endsAbove === above ? endX : crossX,endsAbove === above ? endY : crossY)
    }
    ctx.stroke()
  }
}

function fillRsiArea(ctx, values, x, y, left, right) {
  const start = values.findIndex(value => value.rsi !== null)
  if (start < 0 || start === values.length-1) return
  const middle = y(50)
  const bands = [
    [70,100,'#fda4af'], [50,70,'#ffe4e6'],
    [30,50,'#dbeafe'], [0,30,'#93c5fd']
  ]
  for (const [min,max,color] of bands) {
    const top = y(max)
    const bottom = y(min)
    ctx.save()
    ctx.beginPath()
    ctx.rect(left,top,right-left,bottom-top)
    ctx.clip()
    ctx.beginPath()
    ctx.moveTo(x(start),middle)
    for (let index = start; index < values.length; index++) {
      ctx.lineTo(x(index),y(values[index].rsi))
    }
    ctx.lineTo(x(values.length-1),middle)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
    ctx.restore()
  }
}

function fillMacdArea(ctx, values, x, y, top, bottom) {
  const start = values.findIndex(value => value.signal !== null)
  const end = values.length-1
  if (start < 0 || start === end) return
  for (const [edge,color] of [[top,'#ffe4e6'],[bottom,'#dbeafe']]) {
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x(start),edge)
    for (let index = start; index <= end; index++) {
      ctx.lineTo(x(index),y(values[index].signal))
    }
    ctx.lineTo(x(end),edge)
    ctx.closePath()
    ctx.clip()
    ctx.beginPath()
    ctx.moveTo(x(start),y(values[start].macd))
    for (let index = start+1; index <= end; index++) {
      ctx.lineTo(x(index),y(values[index].macd))
    }
    for (let index = end; index >= start; index--) {
      ctx.lineTo(x(index),y(values[index].signal))
    }
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
    ctx.restore()
  }
}

function drawOscillators(panel) {
  drawCci(panel)
  const {oscillators,oscillatorCanvases,plot,hover} = panel
  const index = Math.max(0,Math.min(oscillators.length-1,hover ?? oscillators.length-1))
  const current = oscillators[index]
  const format = value => value == null ? '—' : Number(value.toPrecision(5)).toLocaleString('en-US',{maximumFractionDigits:8})
  const macdValues = oscillators.flatMap(row => [row.macd,row.signal,row.histogram]).filter(value => value !== null)
  const low = Math.min(0,...macdValues)
  const high = Math.max(0,...macdValues)
  const padding = (high-low)*0.08 || 0.001
  const panes = [
    {title:'MACD (12, 26, 9)', min:low-padding, max:high+padding, guides:[0],
      lines:[['macd',null,'MACD'],['signal','#000','시그널'],['histogram',null,'히스토그램']]},
    {title:'RSI (14)', min:0, max:100, guides:[30,50,70],lines:[['rsi',null,'RSI']]}
  ]

  oscillatorCanvases.forEach((canvas,paneIndex) => {
    canvas.hidden = paneIndex === 1 && !rsiToggle.checked
    if (canvas.hidden) return
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(width*dpr)
    canvas.height = Math.round(height*dpr)
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr,dpr)
    ctx.font = '11px system-ui, sans-serif'
    const pane = panes[paneIndex]
    const isRsi = paneIndex === 1
    ctx.fillStyle = '#263347'
    if (!current) ctx.fillText(pane.title,12,16)
    if (!current || !plot) return

    const top = 44
    const bottom = height-12
    const x = i => plot.left+plot.step*(i+0.5)
    const right = plot.left+plot.step*oscillators.length
    const y = value => bottom-(value-pane.min)/(pane.max-pane.min)*(bottom-top)
    if (isRsi) fillRsiArea(ctx,oscillators,x,y,plot.left,right)
    else fillMacdArea(ctx,oscillators,x,y,top,bottom)
    for (const level of pane.guides) {
      const isRsiMidline = isRsi && level === 50
      ctx.strokeStyle = isRsiMidline ? '#000' : '#d5dae1'
      ctx.setLineDash(isRsi ? [] : [3,3])
      ctx.beginPath()
      ctx.moveTo(plot.left,y(level))
      ctx.lineTo(right,y(level))
      ctx.stroke()
      ctx.fillStyle = '#506075'
      if (plot.showPriceLabels) {
        ctx.fillText(String(level),right+7,y(level)+4)
      } else {
        ctx.textAlign = 'right'
        ctx.fillText(String(level),right-3,y(level)-3)
        ctx.textAlign = 'start'
      }
    }
    ctx.setLineDash([])
    if (!isRsi) {
      const barWidth = Math.max(1,Math.min(15,plot.step*0.7))
      const baseline = y(0)
      oscillators.forEach(({histogram},i) => {
        if (histogram === null || histogram === 0) return
        const level = y(histogram)
        ctx.fillStyle = histogram >= 0 ? '#76c8b9' : '#f1a1a6'
        ctx.fillRect(x(i)-barWidth/2,Math.min(baseline,level),barWidth,Math.abs(baseline-level))
      })
    }
    for (const [key,color] of pane.lines) {
      if (key === 'macd') strokeComparedOscillator(ctx,oscillators,x,y,key,row => row.signal)
      else if (key === 'rsi') strokeComparedOscillator(ctx,oscillators,x,y,key,() => 50)
      else if (color) strokeOscillator(ctx,oscillators,x,y,color,key)
    }
    if (hover !== null) {
      ctx.strokeStyle = '#818794'
      ctx.lineWidth = 1
      ctx.setLineDash([4,4])
      ctx.beginPath()
      ctx.moveTo(x(index),top)
      ctx.lineTo(x(index),bottom)
      ctx.stroke()
    }
    const fragments = isRsi
      ? [
        [pane.title+' ','#506075'],
        [format(current.rsi),current.rsi === null ? '#506075' : current.rsi > 50 ? '#c52636' : current.rsi < 50 ? '#2962ff' : '#506075']
      ]
      : [
        [pane.title+' ','#506075'],
        [format(current.macd),current.macd === null || current.signal === null ? '#506075' : current.macd > current.signal ? '#c52636' : '#2962ff'],
        ['   시그널 '+format(current.signal),'#000'],
        ['   히스토그램 ','#506075'],
        [format(current.histogram),current.histogram === null ? '#506075' : current.histogram >= 0 ? '#76c8b9' : '#f1a1a6']
      ]
    const textWidth = fragments.reduce((sum,[text]) => sum+ctx.measureText(text).width,0)
    ctx.save()
    ctx.translate(12,16)
    ctx.scale(Math.min(1,(width-24)/Math.max(1,textWidth)),1)
    let textX = 0
    for (const [text,color] of fragments) {
      ctx.fillStyle = color
      ctx.fillText(text,textX,0)
      textX += ctx.measureText(text).width
    }
    ctx.restore()
  })
}
