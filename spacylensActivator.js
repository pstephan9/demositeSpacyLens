// SpacyLens Client code to import  


//-- What to call once img elements are in the DOM:
export function equipImages (domainId, overrides) {
    onImgClick = event => getSceneThenReact (event, domainId)
    const images = document.getElementsByTagName ('img')
    for (let i = 0; i < images.length; i++) {
        const img = images[i]
        img.addEventListener ('click', onImgClick, true)
        }
    if (overrides) {
        delay1 = overrides.delay1 || delay1
        delay2 = overrides.delay2 || delay2
        dialog = overrides.dialog || dialog
        magicSlides = overrides.magicSlides || magicSlides
        redirectTarget = overrides.redirectTarget || redirectTarget
        inlineCSS = inlineCSS + overrides.inlineCSS
        }
    const style = document.createElement('style');
    style.textContent = inlineCSS;
    document.head.appendChild(style)
    }
export function cleanup () {
    hideMagicSlides (false, true)
    hideDialog()
    }

//-- Private:
let base1 = `https://us-central1-spacybuy.cloudfunctions.net/`
//if (import.meta.env.DEV) 
//    console.warn ("ACTHUNG"); base1 = `http://127.0.0.1:5001/spacybuy/us-central1/`}
const sceneAPIUrl = base1+"spacyLensScene"
const fetchitAPIUrl = base1+`spacyLensFetchit`
const sceneMap = new Map()
let activeScene = null
let activeSlide = null
let lastTapTime = 0
let onImgClick

//-- Inlined config:
let delay1 = 1000
let delay2 = 3000
let redirectTarget = '_self'
let magicSlides = (() => { // Maximum 10 slides at a time.
    const result = new Array (10)
    for (let i = 0; i < 10; i++) {
        const ms = document.createElement("div")
        ms.classList.add ("spacyLens_magicSlide")
        ms.addEventListener ('mousedown', onSlideMouseDown)
        document.body.appendChild (ms)
        result[i] = ms
        }
    return result
    })()
let dialog = (() => {
    const r = document.createElement("div")
    r.classList.add ("spacyLens_dialog")
    r.addEventListener ('mousedown', hideDialog)
    return r
    })()
let inlineCSS = `
    .spacyLens_dialog {
        position: absolute;
        margin: 24px 0 0 16px;
        border: 1px solid rgb(175, 93, 13);
        border-radius: 2px;
        box-shadow: 3px 3px 2px 2px rgba(228, 169, 111, 0.49);
        background-color: white;
        min-width: 140px;
        color: rgb(175, 93, 13);
        padding: 8px;
        z-index: 3;
        display: none;
        justify-content: start;
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
        border-color: #aaaaff;
        z-index: 1;
        display: none;
        }
    .spacyLens_activeSlide {
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
        background-color: white; /*rgba(255, 255, 255, 0.5)*/
        color: rgb(175, 93, 13)
        }
    `
//-- Implementation:

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

function getSceneThenReact (event, domainId) {
    const image = event.target
    const scene = sceneMap.get (image.src)
    const activateAndReact = scene => {
        activeScene = scene
        if (scene.id) // otherwise nothing happens
            react (event, scene.frames, image)
        }
    if (scene) // Safari is more open to synchronous window.open if part of a click as of 5/20/24
        activateAndReact (scene)
    else // let's go async:
        getScene (image.src, domainId)
        .then (activateAndReact)
    }

function hideDialog () {
    dialog.style.display = 'none'
    }

function react (event, frames) {
    const image = event.target
    const W = image.width
    const H = image.height
    const eventNormX = event.offsetX/W
    const eventNormY = event.offsetY/H
    const framesLength = frames.length
    const rect = image.getBoundingClientRect();
    const absoluteX = rect.left + window.scrollX
    const absoluteY = rect.top + window.scrollY

    let lastClickedI = -1
    magicSlides.forEach ((slide, i) => {
        if (i < framesLength) {
            const frame = frames[i]
            const normx = eventNormX - frame.normX
            const normy = eventNormY - frame.normY
            slide.style.left = absoluteX + W*frame.normX+"px";
            slide.style.top = absoluteY + H*frame.normY+"px";
            slide.style.width = W*frame.normW+"px";
            slide.style.height = H*frame.normH+"px";
            slide.dataset.spacyLensFrameI = i
            const clicked = ((normx>=0)&&(normx<=frame.normW)&&(normy>=0)&&(normy<=frame.normH)) 
            if (clicked)
                lastClickedI = i
            slide.style.display = 'flex'
            }
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
    if (slide === activeSlide)
        actAndShow (activeScene.frames[i], slide)
    else
        activateSlide (i)
    }

let actAndShow = (frame, slide) => { // Perform action and show a small popup called 'dialog'
    actOn (frame)
    if (frame.actionIndex != 2) {
        slide.appendChild (dialog)
        dialog.style.display = 'flex'
        }
    }

let actOn = frame => {
    const ai = frame.actionIndex
    switch (ai) {
        case 1: // buy
            dialog.innerHTML = "Thank you!<br><br>Billed " + frame.param1
            break
        case 2: // redirect
            cleanup ()
            if (redirectTarget === '_postParent')
                window.parent.postMessage(frame.param1)
            else
                window.location = frame.param1 // We'll see how wix or shopify would want that. 5/21/24
                //window.open(frame.param1, '_blank')
            break
        case 3:  // learn
            dialog.innerHTML = `<span class="spacyLens_focusTag">${frame.param1}</span>`
            break
        case 4: // contact someone
            dialog.innerHTML = `<span class="spacyLens_focusTag">${frame.param1}</span>`
            break
        case 5: // call an API
            dialog.innerHTML = `<span class="spacyLens_focusTag"> Calling API ...</span>`
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
            break
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
    slide.classList.add ("spacyLens_activeSlide")
    const frame = activeScene.frames [i]
    const ai = frame.actionIndex
    switch (ai) {
        case 1: // buy
            slide.innerHTML = `<span class="spacyLens_focusTag">${frame.param1}</span>`
            break
        case 2: // redirect
            slide.innerHTML = `<span class="spacyLens_focusTag">🔗</span>`
            actOn (frame)
            break 
        case 3: // learn
            slide.innerHTML = `<span class="spacyLens_focusTag">${frame.param1}</span>`
            break
        case 4: // contact
            slide.innerHTML = `<span class="spacyLens_focusTag">🛎</span>`
            break
        case 5: // call API
            slide.innerHTML = `<span class="spacyLens_focusTag">🔑</span>`
            actAndShow (frame, slide)
            break
        }
    }

function getScene (src, domainId) {
    try {
        return fetch (sceneAPIUrl, {method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify ({domainId: domainId, pic: src})
                            })
        .then(res => res.json())
        .then (scene => {
            sceneMap.set (src, scene)    
            return scene 
            })
        }
    catch (e) {
        console.warn ({reason: 'Error getting: ' + JSON.stringify (e)})
        return Promise.resolve (mockScene)
        }
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

// Warm up both backends
getScene ('warmup', 'bingu').then (s => console.log ("OK: " + s.title))
fetchit ('warmup').then (r => console.log ("OK: " + r))
