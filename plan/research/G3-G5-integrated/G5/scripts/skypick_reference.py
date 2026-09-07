"""Pure reference contract for T7 porting; NOT the application's renderer or sensor code.
Directions must share one frame. Scene assertions must come from verified app code.
"""
from __future__ import annotations
from dataclasses import dataclass
from math import atan2, degrees, isfinite, sqrt
from typing import Sequence
Vector=tuple[float,float,float]
@dataclass(frozen=True)
class VisibleObject:
    object_id:str
    direction:Vector
@dataclass(frozen=True)
class Scene:
    frame_id:str
    objects:tuple[VisibleObject,...]
    complete_rendered_snapshot:bool
    dynamic_proximity_checked:bool
    target_v_band_verified:bool
    target_altitude_deg:float
    sun_altitude_deg:float
    practice:bool=False
    target_vmag:float|None=None

def normalize(v:Sequence[float])->Vector:
    if len(v)!=3 or any(isinstance(x,bool) or not isinstance(x,(int,float)) or not isfinite(x) for x in v):
        raise ValueError('finite 3D numeric vector required')
    n=sqrt(sum(x*x for x in v))
    if not isfinite(n) or n<1e-12:raise ValueError('nonzero finite vector required')
    return tuple(x/n for x in v) # type: ignore[return-value]

def separation_deg(a:Sequence[float],b:Sequence[float])->float:
    a=normalize(a);b=normalize(b)
    cross=(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
    return degrees(atan2(sqrt(sum(x*x for x in cross)),sum(x*y for x,y in zip(a,b))))

def grade(scene:Scene,expected_frame_id:str,target_id:str,selected_id:str|None,tap:Vector)->dict:
    """Fail closed. A quiz never creates an observation, even outside practice mode."""
    def result(ok:bool,reason:str)->dict:
        return {'correct':ok,'reason':reason,'createObservation':False,'practice':scene.practice}
    if scene.frame_id!=expected_frame_id:return result(False,'stale-frame')
    if scene.complete_rendered_snapshot is not True:return result(False,'incomplete-scene')
    if scene.dynamic_proximity_checked is not True:return result(False,'dynamic-proximity-unknown')
    if scene.target_v_band_verified is not True:return result(False,'brightness-band-unverified')
    numeric = lambda x: type(x) in (int,float) and isfinite(x)
    if not numeric(scene.target_vmag):return result(False,'invalid-brightness')
    if scene.target_vmag>4:return result(False,'target-too-faint')
    if not all(numeric(x) for x in [scene.target_altitude_deg,scene.sun_altitude_deg]):return result(False,'invalid-altitude')
    if not -90<=scene.target_altitude_deg<=90 or not -90<=scene.sun_altitude_deg<=90:return result(False,'invalid-altitude')
    if scene.target_altitude_deg<25:return result(False,'target-too-low')
    if scene.sun_altitude_deg>-12:return result(False,'sky-too-bright')
    ids=[x.object_id for x in scene.objects]
    if len(ids)!=len(set(ids)):return result(False,'duplicate-object-id')
    objects={x.object_id:x for x in scene.objects}
    if target_id not in objects:return result(False,'target-not-visible')
    try:
        target=normalize(objects[target_id].direction);tap=normalize(tap)
        distances={k:separation_deg(v.direction,tap) for k,v in objects.items()}
        if any(separation_deg(target,v.direction)<=3.25 for k,v in objects.items() if k!=target_id):
            return result(False,'target-not-isolated')
    except (TypeError,ValueError,OverflowError):return result(False,'invalid-direction')
    if selected_id!=target_id:return result(False,'wrong-object')
    if distances[target_id]>3+1e-9:return result(False,'outside-radius')
    # No credit for an answer-radius tap closer to another visible object.
    if any(d<=distances[target_id]+1e-10 for k,d in distances.items() if k!=target_id):return result(False,'ambiguous-nearest-object')
    return result(True,'correct')
