const base = () => {console.warn ("ACTHIUNG"); return `http://127.0.0.1:5001/spacybuy/us-central1/`}
const base1 = `https://us-central1-spacybuy.cloudfunctions.net/`
const sceneAPIUrl = base()+"spacyLensScene"
const fetchitAPIUrl = base()+`spacyLensFetchit`
//-- Private:
const sceneMap = new Map()
let activeScene = null
let activeSlide = null
let lastTapTime = 0
//-- Overridable:
let inlineCSS = `
    .spacyLens_dialog {
        position: absolute;
        margin: 24px 0 0 16px;
        border: 1px solid orange;
        border-radius: 2px;
        box-shadow: 3px 3px 2px 2px rgba(228, 169, 111, 0.49);
        background-color: white;
        min-width: 140px;
        display: none;
        font-family: Permanent Marker;
        color: orange;
        padding: 8px;
        z-index: 3;
        }
    .spacyLens_magicSlide {
        position: absolute;
        flex-direction: column;
        align-items: center;
        background-color: transparent;
        opacity: 1;
        overflow: visible;
        border-style: solid;
        border-width: 2px;
        border-radius: 6px;
        border-color: transparent;
        z-index: 1;
        }
    .spacyLens_activeSlide {
        border-width: 2px;
        border-top-color: rgba(255, 255, 255, 0.5);
        border-left-color: rgba(255, 255, 255, 0.8);
        border-bottom-color: rgba(128, 128, 128, 0.8);
        border-right-color: rgba(128, 128, 128, 0.5);
        z-index: 2;
        animation: 1.2s spacyLens_shimmer 0s ease-in-out 1 normal both;
        }
    @keyframes spacyLens_shimmer {
        0%, 100% { opacity: 1 }
        50% { opacity: 0.5; background-color: white }
        }
    .spacyLens_focusTag {
        border-radius: 4px;
        text-align: center;
        max-width: 100%;
        padding: 4px;
        font-family: Permanent Marker;
        background-color: white; /*rgba(255, 255, 255, 0.5)*/
        color: orange
        } `
let dialog // set at mount time by vue
let delay1 = 1000
let delay2 = 5000

export function equipImages (domainId) {
    const images = document.images;
    for (let i = 0; i < images.length; i++)
        images[i].addEventListener ('mousedown', e => onPicMouseDown (e, domainId))
    // warm up both
    getScene ('warmup', domainId)//.then (s => console.log ("OK: " + s.title))
    fetchit ('warmup')//.then (r => console.log ("OK: " + r))
    }

export function cleanup () {
    hideMagicSlides (false, true)
    hideDialog()
    }

function hideMagicSlides (keepActiveSlide, forceIt) {
    if (!forceIt) {
        const delta = Date.now() - lastTapTime
        if (delta < delay1 - 5) return
        if ((delta > delay1 + 5) && (delta < delay2 - 5)) return
        }
    else
        magicSlides.forEach (slide => { 
            if (!keepActiveSlide || (slide != activeSlide)) 
                slide.style.display = "none"
                })
    }

const magicSlides = (() => { // Maximum 10 slides at a time.
    const style = document.createElement('style');
    style.textContent = inlineCSS;
    document.head.appendChild(style)
    const result = new Array(10)
    for (let i = 0; i < 10; i++) {
        const ms = document.createElement("div")
        ms.classList.add ("spacyLens_magicSlide")
        ms.addEventListener ('mousedown', onSlideMouseDown)
        document.body.appendChild(ms)
        result[i] = ms
        }
    dialog = document.createElement("div")
    dialog.classList.add ("spacyLens_dialog")
    dialog.addEventListener ('mousedown', hideDialog)
    document.body.appendChild(dialog)
    return result
    })()

function onPicMouseDown (event, domainId) {
    const image = event.target
    getScene (image.src, domainId)
        .then (scene => {
            activeScene = scene
            if (scene.id) { // otherwise nothing happens
                placeMagicSlides (scene.frames, image) // in case scrolling happened, or image resized, etc...
                picTap (event, scene.frames)
                }
            })
    }

function hideDialog () {
    dialog.style.display = 'none'
    }

function picTap (event, frames) {
    const image = event.target
    const W = image.width
    const H = image.height
    const eventNormX = event.offsetX/W
    const eventNormY = event.offsetY/H
    const len = frames.length
    if (activeSlide) {
        activeSlide.innerHTML = ''
        }
    let lastClickedI = -1
    magicSlides.forEach ((slide, i) => {
        if (i < len) {
            const frame = frames[slide.dataset.spacyLensFrameI]
            const normx = eventNormX - frame.normX
            const normy = eventNormY - frame.normY
            const clicked = ((normx>=0)&&(normx<=frame.normW)&&(normy>=0)&&(normy<=frame.normH)) 
            slide.style.display = 'flex'
            if (clicked)
                lastClickedI = i
        }
        else
            slide.style.display = 'none'
        })
    if (lastClickedI != -1)
        activateSlide (lastClickedI)
    lastTapTime = Date.now()
    setTimeout (hideMagicSlides, delay1, true, false)
    setTimeout (hideMagicSlides, delay2, false, false)
    }

function onSlideMouseDown (e) {
    e.stopPropagation()
    const slide = e.target
    const i = slide.dataset.spacyLensFrameI
    const frame = activeScene.frames[i]
    if (slide === activeSlide)
        actAndShow (frame, slide)
    else
        activateSlide (i)
    }

function actAndShow (frame, slide) {
    actOn (frame)
    slide.appendChild (dialog)
    dialog.style.display = 'flex'
    }

function actOn (frame) {
    const ai = frame.actionIndex
    switch (ai) {
        case 1: // buy
            dialog.innerHTML = "Thank you!<br><br>Billed " + frame.param1
            break;
        case 2: // 
            dialog.innerHTML = `<span class="spacyLens_focusTag">Going here:</a><br>
            <a href="${frame.param1}">${frame.param1}</a></span>`
            break;
        case 3: 
            dialog.innerHTML = `<span class="spacyLens_focusTag">${frame.param1}</span>`
            break;
        case 4: 
            dialog.innerHTML = `<span class="spacyLens_focusTag">${frame.param1}</span>`
            break;
        case 5: 
            dialog.innerHTML = `<span class="spacyLens_focusTag" style="font-style: italic"> Calling API ...</span>`
            try {
                fetch (fetchitAPIUrl, {method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({url: frame.param2 || ''})
                    })
                .then(response => {
                    const contentType = response.headers.get('Content-Type')
                    if (contentType.includes('json'))
                    return response.json()
                    else if (contentType.includes('text'))
                    return response.text()
                    })
                .then ( responseContents => {
                    const qq = responseContents[0]
                    const q = qq?qq.q:JSON.stringify(qq)
                    dialog.innerHTML = `<span class="spacyLens_focusTag" style="font-style: italic"> ${q} </span>`
                    })
                }
            catch (e) {
                dialog.innerHTML = `<span class="spacyLens_focusTag" style="font-size: 40px">🔑 ${e} </span>`
                }
            break;
        }
    }

function activateSlide (i) {
    const slide = magicSlides[i]
    if (!!activeSlide) {
        activeSlide.classList.remove ("spacyLens_activeSlide")
        activeSlide.innerHTML = ''
        }
    activeSlide = slide
    if (!slide) return
    const frame = activeScene.frames [i]
    slide.classList.add ("spacyLens_activeSlide")
    const ai = frame.actionIndex
    switch (ai) {
        case 1: // buy
            slide.innerHTML = `<span class="spacyLens_focusTag">${frame.param1}</span>`
            break;
        case 2: // 
            slide.innerHTML = `<span class="spacyLens_focusTag">🔗</span>`
            break;
        case 3: 
            slide.innerHTML = `<span class="spacyLens_focusTag">${frame.param1}</span>`
            break;
        case 4: 
            slide.innerHTML = `<span class="spacyLens_focusTag">🛎</span>`
            break;
        case 5: 
            slide.innerHTML = `<span class="spacyLens_focusTag">🔑</span>`
            break;
        }
    if (ai === 5) actAndShow (frame, slide)
    }

function getScene (src, domainId) {
    const scene = sceneMap.get (src)
    if (scene)
        return Promise.resolve (scene)
    else {
        try {
            return fetch (sceneAPIUrl, {method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify ({domainId: domainId, pic: src})
                                })
            .then(res => res.json())
            .then (scene => {
                sceneMap.set (src, scene)    
                return Promise.resolve (scene) 
                })
            }
        catch (e) {
            console.warn ({reason: 'Error getting: ' + JSON.stringify (e)})
            return Promise.resolve (mockScene)
            }
        }
    }

function placeMagicSlides (frames, image) { // in case scrolling happened, or image resized, etc...
    const rect = image.getBoundingClientRect();
    const absoluteX = rect.left + window.scrollX
    const absoluteY = rect.top + window.scrollY
    const W = image.width
    const H = image.height
    frames.forEach ((frame, i) => {
        const ms = magicSlides[i]
        ms.style.left = absoluteX + W*frame.normX+"px";
        ms.style.top = absoluteY + H*frame.normY+"px";
        ms.style.width = W*frame.normW+"px";
        ms.style.height = H*frame.normH+"px";
        ms.style.display = "flex"
        ms.dataset.spacyLensFrameI = i
        })
    }

function fetchit (url) {
    try {
        return fetch (fetchitAPIUrl, {method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({url: url || ''})
            })
        .then(response => {
            const contentType = response.headers.get('Content-Type')
            if (contentType.includes('json'))
                return response.json()
            else if (contentType.includes('text'))
                return response.text()
            })
        }
    catch (e) {
        return ('Fetch error')
        }
    }
