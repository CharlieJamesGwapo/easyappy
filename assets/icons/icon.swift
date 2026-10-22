import AppKit
let size=1024
let image=NSImage(size:NSSize(width:size,height:size))
image.lockFocus()
NSColor(calibratedRed:0.08,green:0.18,blue:0.18,alpha:1).setFill()
NSBezierPath(roundedRect:NSRect(x:32,y:32,width:960,height:960),xRadius:220,yRadius:220).fill()
NSColor(calibratedRed:0.82,green:0.96,blue:0.59,alpha:1).setFill()
for rect in [NSRect(x:280,y:235,width:110,height:550),NSRect(x:280,y:675,width:440,height:110),NSRect(x:280,y:455,width:360,height:110),NSRect(x:280,y:235,width:440,height:110)] {NSBezierPath(roundedRect:rect,xRadius:12,yRadius:12).fill()}
NSBezierPath(ovalIn:NSRect(x:704,y:770,width:100,height:100)).fill()
image.unlockFocus()
let rep=NSBitmapImageRep(data:image.tiffRepresentation!)!
try rep.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:CommandLine.arguments[1]))
