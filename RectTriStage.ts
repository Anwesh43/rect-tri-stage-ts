const w : number = window.innerWidth
const h : number = window.innerHeight
const nodes : number = 5
const lines : number = 4
const parts : number = 3
const scGap : number = 0.05
const scDiv : number = 0.51
const strokeFactor : number = 90
const sizeFactor : number = 2.9
const foreColor : string = "#673AB7"
const backColor : string = "#BDBDBD"
const delay : number = 20

class ScaleUtil {

    static maxScale(scale : number, i : number, n : number) : number {
        return Math.max(0, scale - i / n)
    }

    static divideScale(scale : number, i : number, n : number) : number {
        return Math.min(1 / n, ScaleUtil.maxScale(scale, i, n)) * n
    }

    static scaleFactor(scale : number) : number {
        return Math.floor(scale / scDiv)
    }

    static mirrorValue(scale : number, a : number, b : number) : number {
        const k : number = ScaleUtil.scaleFactor(scale)
        return (1 - k) / a + k / b
    }

    static updateValue(scale : number, dir : number, a : number, b : number) : number {
        return ScaleUtil.mirrorValue(scale, a, b) * dir * scGap
    }

    static updateToD(s : number, d : number, sc : number) : number {
        return s + (d - s) * sc
    }
}

class DrawingUtil {

    static drawTriangle(context : CanvasRenderingContext2D, sc : number, size : number) {
        if (sc == 0) {
            return
        }
        const sc1 : number = ScaleUtil.divideScale(sc, 0, parts)
        const sc2 : number = ScaleUtil.divideScale(sc, 1, parts)
        const sc3 : number = ScaleUtil.divideScale(sc, 2, parts)
        context.beginPath()
        context.moveTo(0, 0)
        context.lineTo(size * sc1, 0)
        context.lineTo(size * sc1, -size * sc2)
        context.lineTo(ScaleUtil.updateToD(size * sc1, 0, sc3), ScaleUtil.updateToD(-size * sc2, 0, sc3))
        context.stroke()
    }

    static drawRTNode(context : CanvasRenderingContext2D, i : number, scale : number) {
        const sc1 : number = ScaleUtil.divideScale(scale, 0, 2)
        const sc2 : number = ScaleUtil.divideScale(scale, 1, 2)
        context.lineWidth = Math.min(w, h) / strokeFactor
        context.lineCap = 'round'
        context.strokeStyle = foreColor
        const gap : number = h / (nodes + 1)
        const size : number = gap / sizeFactor
        context.save()
        context.translate(w / 2, gap * (i + 1))
        context.rotate(Math.PI / 2 * sc2)
        for (var j = 0; j < lines; j++) {
            context.save()
            context.rotate(Math.PI / 2 * j)
            DrawingUtil.drawTriangle(context, ScaleUtil.divideScale(sc1, j, lines), size)
            context.restore()
        }
        context.restore()
    }
}

class RectTriStage {

    canvas : HTMLCanvasElement = document.createElement('canvas')
    context : CanvasRenderingContext2D
    renderer : Renderer = new Renderer()

    initCanvas() {
        this.canvas.width = w
        this.canvas.height = h
        this.context = this.canvas.getContext('2d')
        document.body.appendChild(this.canvas)
    }

    render() {
        this.context.fillStyle = backColor
        this.context.fillRect(0, 0, w, h)
        this.renderer.render(this.context)
    }

    handleTap() {
        this.canvas.onmousedown = () => {
            this.renderer.handleTap(() => {
                this.render()
            })
        }
    }

    static init() {
        const stage : RectTriStage = new RectTriStage()
        stage.initCanvas()
        stage.render()
        stage.handleTap()
    }
}

class State {

    scale : number = 0
    dir : number = 0
    prevScale : number = 0

    update(cb : Function) {
        this.scale += ScaleUtil.updateValue(this.scale, this.dir, lines * parts, parts)
        if (Math.abs(this.scale - this.prevScale) > 1) {
            this.scale = this.prevScale + this.dir
            this.dir = 0
            this.prevScale = this.scale
            cb()
        }
    }

    startUpdating(cb : Function) {
        if (this.dir == 0) {
            this.dir = 1 - 2 * this.prevScale
            cb()
        }
    }
}

class Animator {

    animated : boolean = false
    interval : number

    start(cb : Function) {
        if (!this.animated) {
            this.animated = true
            this.interval = setInterval(cb, delay)
        }
    }

    stop() {
        if (this.animated) {
            this.animated = false
            clearInterval(this.interval)
        }
    }
}

class RTNode {

    prev : RTNode
    next : RTNode
    state : State = new State()

    constructor(private i : number) {
        this.addNeighbor()
    }

    addNeighbor() {
        if (this.i < nodes - 1) {
            this.next = new RTNode(this.i + 1)
            this.next.prev = this
        }
    }

    draw(context : CanvasRenderingContext2D) {
        DrawingUtil.drawRTNode(context, this.i, this.state.scale)
        if (this.prev) {
            this.prev.draw(context)
        }
    }

    update(cb : Function) {
        this.state.update(cb)
    }

    startUpdating(cb : Function) {
        this.state.startUpdating(cb)
    }

    getNext(dir : number, cb : Function) : RTNode {
        var curr : RTNode = this.prev
        if (dir == 1) {
            curr = this.next
        }
        if (curr) {
            return curr
        }
        cb()
        return this
    }
}

class RectTri {

    curr : RTNode = new RTNode(0)
    dir : number = 1

    draw(context : CanvasRenderingContext2D) {
        this.curr.draw(context)
    }

    update(cb : Function) {
        this.curr.update(() => {
            this.curr = this.curr.getNext(this.dir, () => {
                this.dir *= -1
            })
            cb()
        })
    }

    startUpdating(cb : Function) {
        this.curr.startUpdating(cb)
    }
}

class Renderer {
    rt : RectTri = new RectTri()
    animator : Animator = new Animator()

    render(context : CanvasRenderingContext2D) {
        this.rt.draw(context)
    }

    handleTap(cb : Function) {
        this.rt.startUpdating(() => {
            this.animator.start(() => {
                cb()
                this.rt.update(() => {
                    this.animator.stop()
                    cb()
                })
            })
        })
    }
}
