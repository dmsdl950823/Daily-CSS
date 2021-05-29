class NeuThermostat {
    constructor (el) {
        this.el = document.querySelector(el)
        this.temp = 60
        this.tempMin = 60
        this.tempMax = 90
        this.angleMin = 15
        this.angleMax = 345
        this.outside = this.randInt(60, 75)
        this.humidity = this.randInt(70, 90)
        this.init()
    }

    init () {
        window.addEventListener('keydown', e => this.kbdEvent(e))
        window.addEventListener('keyup', e => this.activeState(e))

        // hard limits
        if (this.tempMin < 0) this.tempMin = 0
        if (this.tempMax > 99) this.tempMin = 99
        if (this.angleMin < 0) this.angleMin = 0
        if (this.angleMax > 360) this.angleMax = 360

        // init values
        this.tempAdjust(this.temp)
        this.outdoorsAdjust(this.outside, this.humidity)

        // init GrrenSock Draggable
        Draggable.create('.temp__drag', {
            type: 'rotation',
            bounds: {
                minRotation: this.angleMin,
                maxRotation: this.angleMax
            },
            onDrag: () => {
                this.tempAdjust('drag')
            }
        })
    }

    // button shadow angle
    angleFromMatrix (transVal) {
        let matrixVal = transVal.split('(')[1].split(')')[0].split(',')
        let [cos1, sin] = matrixVal.slice(0, 2)
        let angle = Math.round(Math.atan2(sin, cos1) * (180 / Math.PI)) * -1

        if (angle < 0) angle += 360
        if (angle > 0) 360 - angle

        return angle
    }
    
    randInt (min, max) {
        return Math.round(Math.random() * (max - min) + min)
    }

    kbdEvent (e) {
        e.preventDefault()
        // this === NeuThermostat
        let kc = e.keyCode;

        if (kc) {
            // up || right
            if (kc === 38 || kc === 39) this.tempAdjust('u')
            
            // left || down
            if (kc === 37 || kc === 40) this.tempAdjust('d')
        }
    }

    activeState (shouldAdd = false) {
        if (this.el) {
            let dragClass = 'temp__drag'
            let activeState = `${dragClass}--active`
            let tempDrag = this.el.querySelector(`.${dragClass}`)

            if (tempDrag) {
                if (shouldAdd) tempDrag.classList.add(activeState)
                else tempDrag.classList.remove(activeState)
            }
        }
    }

	removeClass(el,classname) {
		el.classList.remove(classname);
	}
	changeDigit(el,digit) {
		el.textContent = digit;
	}

    tempAdjust (inputVal = 0) {
		/*
            inputVal can be the temp as an integer, "u" for up, 
            "d" for down, or "drag" for dragged value
		*/
        if (this.el) {
            let cs = window.getComputedStyle(this.el)
            let tempDigitEls = this.el.querySelectorAll('.temp__digit')
            let tempDigits = tempDigitEls ? Array.from(tempDigitEls).reverse() : []
            let tempDrag = this.el.querySelector('.temp__drag')
            let cold = this.el.querySelector('.temp__shade-cold')
            let hot = this.el.querySelector('.temp__shade-hot')
            let prevTemp = Math.round(this.temp)
            let tempRange = this.tempMax - this.tempMin
            let angleRange = this.angleMax - this.angleMin
            let notDragged = inputVal !== 'drag'

            // input is an integer
            if (!isNaN(inputVal)) this.temp = inputVal
            // input is a given direction
            else if (inputVal === 'u') {
                if (this.temp < this.tempMax) {
                    ++this.temp
                    this.activeState(true)
                }
            } else if (inputVal === 'd') {
                if (this.temp > this.tempMin) --this.temp
                this.activeState(true)
            }
            // Draggable was used
            else if (inputVal === 'drag') {
				if (tempDrag) {
					let tempDragCS = window.getComputedStyle(tempDrag)
					let trans = tempDragCS.getPropertyValue("transform")	
					let dragAngle = this.angleFromMatrix(trans)
                    let relAngle = dragAngle - this.angleMin
					let angleFrac = relAngle / angleRange

					this.temp = angleFrac * tempRange + this.tempMin;
				}
            }

            // keep the temperature within bounds
            if (this.temp < this.tempMin) this.temp = this.tempMin
            else if (this.temp > this.tempMax) this.temp = this.tempMax

            // use whole number temperatures for keyboard control
            if (notDragged) this.temp = Math.round(this.temp)

            let relTemp = this.temp - this.tempMin
            let tempFrac = relTemp / tempRange
            let angle = tempFrac * angleRange + this.angleMin

            // CSS variable
            this.el.style.setProperty('--angle', `${angle}deg`)

            // draggable area
            if (tempDrag && notDragged) tempDrag.style.transform = `rotate(${angle}deg)`
            
            // shades
            if (cold) cold.style.opacity = 1 - tempFrac
            if (hot) cold.style.opacity = tempFrac

            // display value
            if (tempDigits) {
                let prevDigitArr = String(prevTemp).split('').reverse()
                let tempRounded = Math.round(this.temp)
                let digitArr = String(tempRounded).split('').reverse()
                let maxDigits = 2
                let digitDiff = maxDigits - digitArr.length
                let prevDigitDiff = maxDigits - prevDigitArr.length
                let incClass = 'temp__digit--inc'
                let decClass = 'temp__digit--dec'
                let timeoutA = 150 
                let timeoutB = 300 

                while (digitDiff) digitArr.push('')
                while (prevDigitDiff) prevDigitDiff.push('')

                for (let d = 0; d < maxDigits; ++d) {
                    let digit = + digitArr[d]
                    let prevDigit = + prevDigitArr[d]
                    let tempDigit = tempDigits[d]

                    setTimeout(this.changeDigit.bind(null, tempDigit, digit), timeoutA)
                    
                    // animate increment
                    const condition1 = digit === 0 && prevDigit === 9
                    const condition2 = digit > prevDigit && this.temp > prevTemp
                    const condition3 = digit < prevDigit && this.temp < prevTemp
                    
                    if (condition1 || condition2) {
                        this.removeClass(tempDigit, incClass)
                        // void tempDigit.offsetWidth
                        tempDigit.classList.add(incClass)
                        setTimeout(this.removeClass.bind(null, tempDigit, incClass), timeoutB)
                    }
                    // animate decrement
                    else if (condition1 || condition3) {
                        this.removeClass(tempDigit, decClass)
                        // void tempDigit.offsetWidth
                        tempDigit.classList.add(decClass)
                        setTimeout(this.removeClass.bind(null, tempDigit, decClass), timeoutB)
                    }
                }
            }
        }
    }

    outdoorsAdjust (inputOutside = 0, inputHumidity = 0) {
        let outdoorEls = this.el.querySelectorAll('.temp__o-value')
        let outdoorVals = outdoorEls ? Array.from(outdoorEls) : []

        this.outside = inputOutside
        this.humidity = inputHumidity

        if (outdoorVals) {
            outdoorVals[0].textContent = `${this.outside}°`
            outdoorVals[1].textContent = `${this.humidity}%`
        }
    }

}

document.addEventListener('DOMContentLoaded', function () {
    const thermostat = new NeuThermostat('.temp')
})