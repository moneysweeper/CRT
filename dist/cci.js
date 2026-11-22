// CCI from the supplied Pine source: HLC3, length 20.
function calculateCci(history, visibleCount) {
  const source = history.map(row => (row.high+row.low+row.close)/3)
  const values = source.map((value,index) => {
    if (index < 19) return null
    const window = source.slice(index-19,index+1)
    const mean = window.reduce((sum,item) => sum+item,0)/20
    const deviation = window.reduce((sum,item) => sum+Math.abs(item-mean),0)/20
    return deviation > 0 ? (value-mean)/(0.015*deviation) : null
  })
  return values.map(cci => ({cci})).slice(-visibleCount)
}

function fillCciArea(ctx, values, x, y, left, right, top, bottom) {
  const start = values.findIndex(point => point.cci !== null)
  if (start < 0 || start === values.length-1) return
  const middle = y(0)
  const bands = [
    [top,y(100),'#fda4af'],
    [y(100),middle,'#ffe4e6'],
    [middle,y(-100),'#dbeafe'],
    [y(-100),bottom,'#93c5fd']
  ]
  for (const [edge,end,color] of bands) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(left,edge,right-left,end-edge)
    ctx.clip()
    ctx.beginPath()
    ctx.moveTo(x(start),middle)
    for (let index = start; index < values.length; index++) ctx.lineTo(x(index),y(values[index].cci))
    ctx.lineTo(x(values.length-1),middle)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
    ctx.restore()
  }
}

function drawCci(panel) {
  const canvas = panel.cciCanvas
  canvas.hidden = !cciToggle.checked
  if (!cciToggle.checked) return
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(width*dpr)
  canvas.height = Math.round(height*dpr)
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr,dpr)
  ctx.font = '11px system-ui, sans-serif'
  ctx.fillStyle = '#263347'
  const values = panel.cci ?? []
  if (!values.length || !panel.plot) {
    ctx.fillText('CCI (20)',12,16)
    return
  }
  const {left,step,showPriceLabels} = panel.plot
  const right = left+step*values.length
  const all = values.map(row => row.cci).filter(value => value !== null)
  const min = Math.min(-120,...all)
  const max = Math.max(120,...all)
  const pad = (max-min)*0.05
  const y = value => height-12-(value-min+pad)/(max-min+2*pad)*(height-56)
  const x = index => left+step*(index+0.5)
  fillCciArea(ctx,values,x,y,left,right,44,height-12)
  for (const level of [-100,0,100]) {
    ctx.strokeStyle = level === 0 ? '#787b8680' : '#787b86'
    ctx.setLineDash(level === 0 ? [] : [3,3])
    ctx.beginPath()
    ctx.moveTo(left,y(level))
    ctx.lineTo(right,y(level))
    ctx.stroke()
    ctx.fillStyle = '#506075'
    ctx.textAlign = showPriceLabels ? 'start' : 'right'
    ctx.fillText(String(level),showPriceLabels ? right+7 : right-3,y(level)-3)
  }
  ctx.textAlign = 'start'
  ctx.setLineDash([])
  strokeComparedOscillator(ctx,values,x,y,'cci',() => 0)
  const index = Math.max(0,Math.min(values.length-1,panel.hover ?? values.length-1))
  if (panel.hover !== null) {
    ctx.strokeStyle = '#818794'
    ctx.lineWidth = 1
    ctx.setLineDash([4,4])
    ctx.beginPath()
    ctx.moveTo(x(index),44)
    ctx.lineTo(x(index),height-12)
    ctx.stroke()
  }
  const format = value => value === null ? '—' : value.toFixed(2)
  const cci = values[index].cci
  const title = 'CCI (20) '
  const number = format(cci)
  const titleWidth = ctx.measureText(title).width
  const totalWidth = titleWidth+ctx.measureText(number).width
  ctx.save()
  ctx.translate(12,16)
  ctx.scale(Math.min(1,(width-24)/Math.max(1,totalWidth)),1)
  ctx.fillStyle = '#506075'
  ctx.fillText(title,0,0)
  ctx.fillStyle = cci > 0 ? '#c52636' : cci < 0 ? '#2962ff' : '#506075'
  ctx.fillText(number,titleWidth,0)
  ctx.restore()
}
