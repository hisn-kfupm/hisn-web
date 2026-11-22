import type { StringKey } from '@/lib/i18n/t'
import type { PublicEvent } from '@/lib/events/types'

/**
 * Every photo the site shows, by use (revision brief 04 §2). They are stand-ins from Wikimedia
 * Commons (see public/images/stand-in/CREDITS.md) until the team has its own photos: swap a file
 * and its width, height and blur here. `alt` is an ar.json key; resolve it with t() on the server
 * and hand the text to <Photo alt>. width/height are the file's real pixels, so next/image never
 * guesses; blurDataURL is a 10 px PNG of the same photo for the blur placeholder.
 */
export type SiteImage = { src: string; width: number; height: number; blurDataURL: string; alt: StringKey }

/** what an event card shows: the admin's image as is, or one of our photos */
export type EventCover = (SiteImage & { remote: false }) | { src: string; remote: true }

function photo(slug: string, width: number, height: number, blurDataURL: string): SiteImage {
  return { src: `/images/stand-in/${slug}.jpg`, width, height, blurDataURL, alt: `img.${slug}` as StringKey }
}

const heroCircuitTraces = photo('hero-circuit-traces', 1800, 1350, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAICAIAAABPmPnhAAAA/0lEQVR42gXB3U6CUAAAYOCcBR6DwVF+CrPkIsdF6br0zhvXeobeoDfp0ZrrgjXLtYZMnGSE/Mg5IQp9H6s+jtK5t/dC3jbQsJd+etbwVjMu4iT1Aw9Mnp9ASxJ0OfbXJ0gQrQ4pC8PskrpQFBV4+++b+/GoP8jAMdklbEz/wrhnXwMstSQF1FEe5dsmQgemXkwd+rYsKYUyulLPzc4lhCVzgOyGK0W9PXgYJ3lGYQVlBbFw7S4gA7mGiu+6tiw2Q6zPl+77zEkj4h6FjBLAAY639LahhqtgFQbO9GX7OuM1XJ0iku4gU1TEDz7ynxLWm9+vhomV/qTS8ZlmMAz3D/tnclqVE9pyAAAAAElFTkSuQmCC')
const heroSatelliteCleanroom = photo('hero-satellite-cleanroom', 1800, 1374, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAICAIAAABPmPnhAAABA0lEQVR42gH4AAf/AUpnrX9+T/0CAOTm9/Xk3+Lm9CUiFw0aHPsBAfv/AAMVBhISEgv1+QX06ez/8+wlFwUFCgv8AAbh9ADtBAUDCP8F+ejiEPrp9eji9e/sCwT6/AEM7fL81u7/zsDNBDU3MDc8OyAWCdnLxe/v8ekDKQ4FG/X5+QHo5fjV0wOkp586PDDw7u7Z1NP24dT38ezy8PIICQoMBfoLAewB+/z26+juw7vD7OTbBfnw6Oz54N7k/wUKJDA0CRQaAvv7/PDv8Pf5+fwCBhMkJwcWHxkqNfPy8cq+uPz6/wT+/v4VFxI9QTbl4NrIwboMFzUPFgTw8Oz19foBAPyMzok3mIPJWQAAAABJRU5ErkJggg==')
const heroJetEngineFan = photo('hero-jet-engine-fan', 1800, 1800, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAABJUlEQVR42iXBS07CQAAA0JnOr+3QmeJCJIVWARMT4yEsiUYX7uQwJN7JjSExwQUb9QhEDAs/cYUE2k4/dMaF78HJw/1sNpvPF9qYThidx8NhHEshwL+b6zgKQ8Y4Ja5je+2DYHQ7en15NsYYY5DvN1frTVFWAADpe45rL97ep9Onfv+oPxhgDTG0sDEGQiibHrMdTNDn1/d4fNdq7aMg6BZVmaVZXddCCl96uVK5qla/60KlqNM5LMqyKiutdZqk2802TZSuDWM0STPL5RxC3PCEyzkmtKw0MJAxQinNMoUtygmxESII4SJXWtcAGIwQ507QbuF2dFxruCvzZLvJs2RXFQhZXoOH3aDXi/DV5cXkEf18LDFlWkgItGPTvaYUonF2evIHgCR+XXLxX/8AAAAASUVORK5CYII=')
const heroDataCentreAisle = photo('hero-data-centre-aisle', 1400, 934, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAHCAIAAAC+zks0AAAAvUlEQVR42gXBS3LCMAwAUFWxcdIPGJhh1/YKrHrIDqfqgiMwnKBsykBIYtmSI/W9p8Ph28D2+y+hPm52dYZaGcCOx58YN07VauVhuL88v6bpBgCAi9u9FxFVxVyyGRClIjyrm8FPlFMamYUoOxOevc80AcCADhFLSTSNIszMaHN1DebMw/gIrfcLVwqxcAjee4c9cdt2AIaIIXRxFRtswCCutzGu3PX6B1rfPz7flssutKfTWWsx1cvlt6y3/+MLd1U58AapAAAAAElFTkSuQmCC')
const heroSolderingBoard = photo('hero-soldering-board', 1800, 1200, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAHCAIAAAC+zks0AAAA5ElEQVR42gHZACb/ARQVFAEBAS8nJvz69hMcLDk6P7ezpe3w7/79/vfz6gM4ODU5KiA4KyH59fT2/voGBwDj4NtBRkciIyDg29wDEAgVMCQUDxANAwMCCgIBAwwMDRESNDQzDhAQCw0NAhEQ/v7+/Pz8+xAOCwEEAgoNG/T3CM/Q3/n3/RsdHgQtLyr+9/MA/f/08/TS1+LhxO709PIPDwAxMS4FBQIEBAkO/fXz+Pf46evu2+Dt/AP4JygaMTIl5+XrtrfCBPf4/f/3+AsFAvn5+g0SBENIQCAgI7a0vMfHxf/49XC+ZDfj5SsOAAAAAElFTkSuQmCC')
const heroKfupmTower = photo('hero-kfupm-tower', 1800, 1201, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAHCAIAAAC+zks0AAAA2UlEQVR42gXBUU7CQBAA0Jndadlt3QD64Q9EMNFgDJrAXTyA317Ea3gFT2BiYvwx8QSEiBoRQqXWdtl2xvfw9u6V4lgpBQDMIswsyMw+hL9yR512QjoSRBZgZgDAugxoE0mdyelgL9IaGQlQg9LS1K1qlXG0eXuZP99TNn+0Nil8HZiX35/D4Ygonz09FKtFJBpvrq+MNTY1hS/eP5aH++3p5enJ4My5LouibqclukydGxyNR8dZrM3k/II0MUCzq9Q2/Mam74P8bGebfN3v9RKbCkPjq/XX4h+dvWSOvIMY/gAAAABJRU5ErkJggg==')
const hero3dPrinter = photo('hero-3d-printer', 1800, 1192, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAHCAIAAAC+zks0AAAA5ElEQVR42gHZACb/AWxgXerh2NDRzRUXBjQ2KwYRN/MDFgb98/307OHi2wOIRC40DQLvBwn9DR8fE+4BAffx/zQQGTQG/vQE9uwE3/T4/BQJHBYqGvn1LxLm6f4K/vzWAfnk+QH2+wb+A+wM9fMS5e3u9fPzBOnzGPMDCf4Mx/fw3uLk0PP2+gM+Ly4IBRseBQYiNBL/DhYcJP09OPj80fYHDd/v7+sEAmmV+wIB9PfuLCTnFePxAR8P6RX+6zPk9vTpDfTkAWLk/wUEAAP/AA77+BH/9fIJEfkGAvf+APTzAPXf8BpZb8zt7aHdAAAAAElFTkSuQmCC')
const verbLearnAuditorium = photo('verb-learn-auditorium', 1800, 1200, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAHCAIAAAC+zks0AAAA5ElEQVR42gHZACb/ATklHfr/AiEgHPfx8Q4JBgwNCAEDA/r6/TA5PF5mawIKBAYE/wD17vICAwUDBwcIBg39+v0LCAkpLC4ODxAEJhIT/QMGFBoXHhwaExQQDAsO5eXa6/L2/wAC/P79Ax4LBxECAAcJBhoVEAgFBA4RFPr99+bx787P0ubj4AQHAAkzEx/oCAP7+fr2+Pbi0s/q5uPg8vb6/PnHweoD+wgG5wgH3OTn4evv2OfqTSQREAwKNBobBvv64/D0AwL/Aff69fn6+OHq60YfElwyHggSCc3t9Obs79vm6W/EYWj0WoSRAAAAAElFTkSuQmCC')
const verbQualifyWorkshop = photo('verb-qualify-workshop', 1800, 1200, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAHCAIAAAC+zks0AAAA5ElEQVR42gHZACb/ASUqF2JbYe7t+bLK8C4T5gH/9/P4ANLY2+Xi5wEBAQT9AP8A/P0RDPspFu/19PIQAP/++PslHBX8+foDBQQDMjEmEAkPuc3JFRgNEgkM4+DjGxgPVTos5O72CgkFA2dobT00LTshED4wMiEUFcvW2uDt7x4KEDEYEQbq6ANXTUYiHhgvPlEHBQIRGR8uMDojEAn12+oPDA0CIBgC9fn99f0GAQQJERoh9/jnCgLuRURCGhsW1wQKyOf7BERHSRgYF/Dv5Qr60AgJGhAUFBMUGRQ23cWfqBEC/UcpVMZAo2EZAAAAAElFTkSuQmCC')
const verbConnectShowcase = photo('verb-connect-showcase', 1800, 1200, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAHCAIAAAC+zks0AAAA5ElEQVR42gHZACb/ATdgmwDw4t3Z2QYFAgkKDPf9AQXy0ur3BwMAAv78+QRSMxvy+hzn4uPz48QTHCEICRwEGzIaAvsgC/TJ1NkDNjhFJBsV7vDwPDEjEAwK/wAE9PkBNBv/DBEm+f8LAyUqOiYjHzkrGTQxMBUXFtzc2RcOBQMLDeHm8e/4AgLc39769O4B9+vw6+QJAfr7/wXv9fsoEP389evv7OAEJRwR+/nx5+3n/gQHCAcLLiIR8PDuxtTb3+Tm8/X0BAgA8eHe072+vM/W2EE8PUpAMwv/99/f9fz68iQYB1rQaz+/vKqEAAAAAElFTkSuQmCC')
const deptAwarenessAircraftHangar = photo('dept-awareness-aircraft-hangar', 1800, 1200, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAHCAIAAAC+zks0AAAA1klEQVR42gXBYU+CQBgA4OPuPUGug0ipQdrmGpvNOftUbtX//wn5JWJBtJnKpDu8C+J6Hms5uwnGPrAz7/wCCMhTUx2qVimtu311JHcemoAy/qhFSJ6k+Dl2re7+DLKQ49jQ8FgMDSam1Q0AieLpAKMonpafBSaYPK8fwBszzm+T5Gn9Yv+qLBfzxWp1/7h53ZB5MqMsrLfb8Coq0rT82r+VuzxLs/ePvChJPLkOAn4ZjlzOe4KFVkMHA5jd4ZuAwVLqWig0cHsL9whTSh2bMub6HhN1/Q/RJ1utTWLqUwAAAABJRU5ErkJggg==')
const deptQualificationStudentShop = photo('dept-qualification-student-shop', 1800, 1200, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAHCAIAAAC+zks0AAAA5ElEQVR42gHZACb/AZGJj+Df1svGvDUyL/j6Avf+FyYe/BUVGPsC/RcL9gQLCP/Q197P4PDh7s0qHhgdFu/65v8LHf8zRl/w4+wD//jrFRISDQwC6+zp6vL409zl6fb8LDIQw8zEDgYcA/39+3NPSWAK/xT68Cw9RBkMAjIfDwTv6cPT49nL1QNXSjMx9efy5PA0+AD3493G/PwZIx/dDvgQDBQE+xADPTg0zvD08SUc9QwU9vv2Ch4dBhUZ9wD/9Or+4uHmAx4VDiMODBsKDwQEBfEOEuoCBw4NDP/7+w8PDSUhJXWaaQVZo81bAAAAAElFTkSuQmCC')
const deptSystemsControlRoom = photo('dept-systems-control-room', 1800, 1017, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAGCAIAAAB1kpiRAAAAxUlEQVR42gG6AEX/AWRogDo5NsDBuePk1gMFBv75/wIABOnn4gEGCPn9DgT18+Ls6g////X+//4E/fseHB4JBAMA+uwBAQIDBgkBBQQEAP/+AwAAKCUhQE9Q8tjN6uXqEhYJ3uPu8PP2AQkIBwkIBhwUEBkOCBcYGOTa4uHt8QEMBu7w9e7z9QE/MyITDgr8//7Hzd72+f4IAwIAAf8fGBEGBP3q9f0DRDEXGREGGQ4DEg4D/wD+/v//ExELDw0K7u72BQACcu1PhtuWFxcAAAAASUVORK5CYII=')
const deptCyberServerCables = photo('dept-cyber-server-cables', 1400, 1398, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAABGklEQVR42gXBy07CQBQA0E577/RBLQVUhAiJgZi49Itc+gH+mktX/oELBYnGBViQllBenek8PYc8PD6tFu9p09mWJE1vwMSz6XPFqqvzjuI1OCbopLHhq1Hv8qIboVbrOfb716tl7lsC93f9l9fJX2HC7WZY4a5YnpjgspS1vB0N3LfJxzLfEYwRUuImaIwUMstLJTRFhOn3z/5UGy6cgLHu+Ctby5oZobyY1tUJ5ptD0ggJaUEYzT7dnCVsn3tWM1YNUg8O20wUVYSOgsh1fkHkWkgaoDK6FNLzEK3jBRSjwNfaFPlCG+0S61MouIBeCygmRltlHGKlUYoGEIVUSq0Eg9ZZGMcJP/Kw4VuOi8wVUh2ZbTfbw070DwOJo3eGTm2zAAAAAElFTkSuQmCC')
const deptManufacturingLaserCutter = photo('dept-manufacturing-laser-cutter', 1800, 1350, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAICAIAAABPmPnhAAABA0lEQVR42gH4AAf/AXNsWB4bHAwADAP3+ejR1P7o7O/f5fr7/QAEAQEDAgNLRToF+fcmCAsPBgcLCQgMGxf7DQbf8u7vAP4DFRAE0+H3LSceEzQx3uXv3fn8GQsJIBgcCh0h+O3pDQoIAu7z+wUOFvwAB8fN1La6xNDZ3gUbJAQrOeIUIuIQEQIDAQAFCQ77/f/9/fwGCAgEDBPZ5/axwMz4AgQiOkoBOktYBAEDDQgI7Ozr/Pr6BgoNFR4mJy4nHR0bBAcJBDlXZ/Hq6BMNCxkRDfb2+fT19BocGRUXGA0KBOvy9gQYFhchHB0JAgD7+voGDv8WBQUJCAUWEAn7/Pz6+/3IKWAPwwqeHgAAAABJRU5ErkJggg==')
const deptDataMonitorWall = photo('dept-data-monitor-wall', 1800, 954, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAFCAIAAADzBuo/AAAAmklEQVR42gXBQQuCMBgA0O3blGkKVlBEhkEInTwGgefu/f9ORQUm2TZz6ebWe/h8KodeZ1n64ZxzGQasN+Nuu7k/H9ZaqmEmTX19ydU6H5kAYpFqL7VqWsAOqFBEdcinIH6IBlOt1bsVPN7TSFrV4PJwDMGBQ9WXJ3GktUaEeW7iM2LAo0WR+4DCZL5YpngQxkE3jOARXt0Qon8y7kqkKhF+nAAAAABJRU5ErkJggg==')
const eventPanelDiscussion = photo('event-panel-discussion', 1800, 1198, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAHCAIAAAC+zks0AAAA5ElEQVR42gHZACb/AUBwmu3f1k9mdQoC/smxo/jl1yVBWf0PG/r39vcBCQMaMUfz5+P/+/kEExvt3tT27OXs7e/k/w7u+Pzm8fMD+wcT8/Dt7NTG597X+vXw8O/s6dzUIA8GGwwAGgT4AxszS/z38gT58/j59wsEAPXy7PHz9AD+/N7JufHx7wMQGiMG7d0FBQQfLT47CvEoFAnvBxfl5+nu7er09vcD/urk//PsLS4wHh0h8NS9/P4C3/cJ59/R/v39+f3/BP//Avr8//72AO739e73/P8GBdvh3gL9/AEDBP8CBDcShWNR6H6XAAAAAElFTkSuQmCC')
const eventTalkAudience = photo('event-talk-audience', 1800, 1198, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAHCAIAAAC+zks0AAAA3klEQVR42gXBTTIDQRQA4Nevp3taTKIySUmhoiqozMoGZ7B3itzEBZzC0soFHMAiCxEWxGKYweiqzuinf3wfO59dZp3OcHv3pDiQHN5WL2tdDfPuOPNBDZLj6dhCur8zml2c/lK4uvEm8FFRwOez6R0mZVWpwaSs9fXtPUVcPL1+PM5Xy4dJ1xMu2VFxFoAnIu2JlG9s5v0tZ77qsvJeW7LcE2XuO66buqkl6T1h7uYLBa02P41puRTSAUQWIwolE+Rg2jb8WYHRI6K1FEJEZH3Fc4XvjbZE1jkHGCP7BzZabeqtFYU3AAAAAElFTkSuQmCC')
const eventLectureLaptops = photo('event-lecture-laptops', 1800, 1200, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAHCAIAAAC+zks0AAAA20lEQVR42gXBzU7CMAAA4PWH1VVs10kZizMSrxoTX8KLb8Jr+G7GhJsHL0aXTHGQMAqhpdu6H78PvCyex5yLS+l5CHT6rLNvH9uNqktzss7h5TKjIhrAbzc4CPok8uVkVigDh1ZyH/dcCBbgUXA7nwHQHtUOAu/+4U5r0+wVupbsPT+M2YQQ7yoRIY+/8jUi9DvL18qAxdPjZ1HWI1737iKkjPhIlRvE7OHYuhoSveeNXRV/sZwGNFSn6vVn59qmGqBWW5QGGNFzCyAOU+u6m3mcJHE6jbJ8pU31DwZFZYngBcx7AAAAAElFTkSuQmCC')
const eventWorkshopTables = photo('event-workshop-tables', 1800, 1200, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAHCAIAAAC+zks0AAAA5ElEQVR42gHZACb/AUI/OBQXGyAZFRYTD8/T1wMFBd3k6e3w9AADAvL09QQpKSgnMT7Sxb4F9977AAQDCRkMBOjk9vQqLScXFRAEA/LvEAH3BvHo+vv/JBkfGBsW3gQcFgkB9gD4GhkVAxIcFPHo6fcOFjs9SDk8Ojk5MgkHCPPr8dfY4crNzwP1+vz/BQVRW1g3MCweICDw8/MMEhr/BQqeq7oeHBoCAwUJPzk6LyAmFRYaBAcLDhEbBfrsJyMXQj82+ff3AZqenhISEzQwLhUVFAEBAQIBAfv6+Pz8+/Hw85iUldkcUo9/0bOAAAAAAElFTkSuQmCC')
const eventLectureSlide = photo('event-lecture-slide', 1800, 1350, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAICAIAAABPmPnhAAAA50lEQVR42gXBOU/DMBgAUPvzFSdNQjMh1LLAhoSE2DuwMPGLmRhZERLiqFgQ4mquJrEdX7yHr65vGBNpnhfLCggd9j0XEgWk1WSmgRrVtI05ZCvCy/XZaa/6jBf1V9M+PvTNN10fr/Zdu8iklOxic8loApjd3979vTEoMtCjPijL6GwwzlsYm8l77LRF1qVCkGWVIfUbggWC2t3uc/v88fry874du9o5jTfnJ0jXDrOBFzYwCn52MSKMYsQAUHVz4kSFiLMxBa3GQVKSSx7c7I2iTwwIUKdnLsxRQTjGAQU/TxH5apH8A+adeMAb+FTbAAAAAElFTkSuQmCC')
const talentDesignShowcase = photo('talent-design-showcase', 1800, 1200, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAHCAIAAAC+zks0AAAA5ElEQVR42gHZACb/AWBidwD//kxFIRoaEdjc5o+Xruvp6x4eHfz6+OTl5gG3r7kDAgHe3MyztLLr8/vt9AAMAvbf5ekuIRbv9fcDfXt18PH+AgghAQQQCwYA9PTvSDw0FRcbBQUKQ0VdBPr4+ebk6/L0ABgWIissNhYcxT45Lyzx+Nrf7A4PGAT5+vsD//b+/QDu7ekCAvsmIyIHBAb//PQLDBLZ2cwEBgT/293Oz9bjHRQFFhT++PQE3trZ9PkFz9Lg7eziAgDqr9zYvrS4q+Tn5TY7PSkwLQIOFgQJBP776+Xi1/18b8fvMDi0AAAAAElFTkSuQmCC')
const notfoundEmptySocket = photo('notfound-empty-socket', 1800, 1200, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAHCAIAAAC+zks0AAAAzUlEQVR42gXBTUvDQBAA0JnZ2WyyaZCCl7aCXvTin/Ii/lQvgtYUCl4K9lBJk2U3ofncbXwPH5+eIxbj2AN4gkB4JSIQ8tK169Utb9YbQTj5oW+bOYypVhzJn8Pv5EN9Gfjt9WWhY+NcbSsVIaub7/0+PxzPxhbW8sP9nZLkbOXKk6Cg0naY5kRpISUi8IAxk5RJhlLn+TbJqu7KADMRkCB+//haLtK/07EojGvHujuT0k3d+N4jAu+2nzELZytTFsaUMAeWnCVxxEtA+AeCwGCzTcLH4QAAAABJRU5ErkJggg==')

export const images = {
  /** the hero mosaic's photo bricks, in laying order */
  hero: [heroSatelliteCleanroom, heroCircuitTraces, heroKfupmTower, heroJetEngineFan, heroSolderingBoard, heroDataCentreAisle, hero3dPrinter],
  /** «تعرّف · تؤهّل · تصل» */
  verbs: { learn: verbLearnAuditorium, qualify: verbQualifyWorkshop, connect: verbConnectShowcase },
  /** one per department code in data/departments.json */
  departments: {
    DEPT_1: deptAwarenessAircraftHangar,
    DEPT_2: deptQualificationStudentShop,
    DEPT_3: deptSystemsControlRoom,
    DEPT_4: deptCyberServerCables,
    DEPT_5: deptManufacturingLaserCutter,
    DEPT_6: deptDataMonitorWall,
  } as Record<string, SiteImage>,
  /** talk and workshop scenes: event covers without a department, and general event imagery */
  events: [eventPanelDiscussion, eventTalkAudience, eventLectureLaptops, eventWorkshopTables, eventLectureSlide],
  talent: talentDesignShowcase,
  /** a recording without its own thumbnail */
  library: eventLectureSlide,
  /** 404: an empty socket */
  notFound: notfoundEmptySocket,
}

/** each department's cover pool: its own photo, a scene and a subject photo, picked by event id */
const coverPools: Record<string, SiteImage[]> = {
  DEPT_1: [deptAwarenessAircraftHangar, eventPanelDiscussion, heroJetEngineFan],
  DEPT_2: [deptQualificationStudentShop, eventWorkshopTables, verbConnectShowcase],
  DEPT_3: [deptSystemsControlRoom, eventTalkAudience, heroSatelliteCleanroom],
  DEPT_4: [deptCyberServerCables, eventLectureLaptops, heroDataCentreAisle],
  DEPT_5: [deptManufacturingLaserCutter, verbQualifyWorkshop, hero3dPrinter],
  DEPT_6: [deptDataMonitorWall, eventLectureSlide, heroCircuitTraces],
}

/** every distinct photo, for checks */
export const allImages: SiteImage[] = [
  ...new Set([...images.hero, ...Object.values(images.verbs), ...Object.values(images.departments), ...images.events, images.talent, images.library, images.notFound]),
]

/** the department's photo; the first talk scene for an unknown code */
export function departmentImage(code: string | null): SiteImage {
  return (code && images.departments[code]) || images.events[0]
}

/**
 * An event's cover: its image_url when it has one (admins paste any host, so it stays remote),
 * otherwise one photo from its department's pool, picked by event id so a card never changes
 * between renders; events without a known department use the talk and workshop scenes.
 */
export function eventCover(event: Pick<PublicEvent, 'id' | 'imageUrl' | 'departmentCode'>): EventCover {
  if (event.imageUrl) return { src: event.imageUrl, remote: true }
  const pool = (event.departmentCode && coverPools[event.departmentCode]) || images.events
  return { ...pool[Math.abs(event.id) % pool.length], remote: false }
}
