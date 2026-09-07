#!/usr/bin/env python3
from __future__ import annotations
import json,unittest,math
from pathlib import Path
from dataclasses import replace
from skypick_reference import Scene,VisibleObject,normalize,separation_deg,grade
ROOT=Path(__file__).resolve().parents[2]
def v(deg):return (math.cos(math.radians(deg)),math.sin(math.radians(deg)),0.)
BASE=Scene('frame-1',(VisibleObject('target',v(0)),VisibleObject('other',v(30))),True,True,True,50.,-20.,target_vmag=1.0)
class ReferenceTests(unittest.TestCase):
    def score(self,scene=BASE,tap=v(0),selected='target',frame='frame-1'):
        return grade(scene,frame,'target',selected,tap)
    def test_zero_separation(self):self.assertAlmostEqual(separation_deg(v(0),v(0)),0)
    def test_right_angle(self):self.assertAlmostEqual(separation_deg((1,0,0),(0,1,0)),90)
    def test_antipodes(self):self.assertAlmostEqual(separation_deg((1,0,0),(-1,0,0)),180)
    def test_wraparound(self):self.assertAlmostEqual(separation_deg(v(359),v(1)),2)
    def test_pole_longitude_independent(self):self.assertAlmostEqual(separation_deg((0,0,1),(0,0,5)),0)
    def test_scaled_vector(self):self.assertEqual(normalize((3,0,0)),(1,0,0))
    def test_zero_vector_invalid(self):
        with self.assertRaises(ValueError):normalize((0,0,0))
    def test_nonfinite_vector_invalid(self):
        with self.assertRaises(ValueError):normalize((float('nan'),0,1))
    def test_boolean_vector_invalid(self):
        with self.assertRaises(ValueError):normalize((True,0,1))
    def test_center_hit(self):self.assertTrue(self.score()['correct'])
    def test_radius_boundary_included(self):self.assertTrue(self.score(tap=v(3))['correct'])
    def test_outside_radius(self):self.assertEqual(self.score(tap=v(3.001))['reason'],'outside-radius')
    def test_negative_direction_boundary(self):self.assertTrue(self.score(tap=v(-3))['correct'])
    def test_wrong_id_not_accepted(self):self.assertEqual(self.score(selected='other')['reason'],'wrong-object')
    def test_no_selected_id(self):self.assertFalse(self.score(selected=None)['correct'])
    def test_stale_frame(self):self.assertEqual(self.score(frame='old')['reason'],'stale-frame')
    def test_incomplete_scene(self):self.assertEqual(self.score(replace(BASE,complete_rendered_snapshot=False))['reason'],'incomplete-scene')
    def test_dynamic_unknown(self):self.assertEqual(self.score(replace(BASE,dynamic_proximity_checked=False))['reason'],'dynamic-proximity-unknown')
    def test_v_band_unknown(self):self.assertEqual(self.score(replace(BASE,target_v_band_verified=False))['reason'],'brightness-band-unverified')
    def test_low_altitude(self):self.assertEqual(self.score(replace(BASE,target_altitude_deg=24.99))['reason'],'target-too-low')
    def test_25_degrees_allowed(self):self.assertTrue(self.score(replace(BASE,target_altitude_deg=25))['correct'])
    def test_daylight_rejected(self):self.assertEqual(self.score(replace(BASE,sun_altitude_deg=-11.99))['reason'],'sky-too-bright')
    def test_missing_target(self):self.assertEqual(self.score(replace(BASE,objects=(BASE.objects[1],)))['reason'],'target-not-visible')
    def test_neighbor_collision(self):self.assertEqual(self.score(replace(BASE,objects=(BASE.objects[0],VisibleObject('other',v(2.9)))))['reason'],'target-not-isolated')
    def test_clearance_margin(self):self.assertEqual(self.score(replace(BASE,objects=(BASE.objects[0],VisibleObject('other',v(3.2)))))['reason'],'target-not-isolated')
    def test_nearest_other_rejected(self):
        s=replace(BASE,objects=(BASE.objects[0],VisibleObject('other',v(4))))
        self.assertEqual(self.score(s,tap=v(2.9))['reason'],'ambiguous-nearest-object')
    def test_duplicate_ids(self):self.assertEqual(self.score(replace(BASE,objects=(BASE.objects[0],BASE.objects[0])))['reason'],'duplicate-object-id')
    def test_invalid_tap(self):self.assertEqual(self.score(tap=(0,0,0))['reason'],'invalid-direction')
    def test_invalid_object(self):self.assertEqual(self.score(replace(BASE,objects=(VisibleObject('target',(0,0,0)),)))['reason'],'invalid-direction')
    def test_practice_no_observation(self):
        r=self.score(replace(BASE,practice=True));self.assertTrue(r['correct']);self.assertFalse(r['createObservation'])
    def test_real_mode_no_observation(self):self.assertFalse(self.score()['createObservation'])
    def test_invalid_altitude(self):self.assertEqual(self.score(replace(BASE,target_altitude_deg=float('nan')))['reason'],'invalid-altitude')
    def test_vmag_missing(self):self.assertEqual(self.score(replace(BASE,target_vmag=None))['reason'],'invalid-brightness')
    def test_vmag_nan(self):self.assertEqual(self.score(replace(BASE,target_vmag=float('nan')))['reason'],'invalid-brightness')
    def test_vmag_boolean(self):self.assertEqual(self.score(replace(BASE,target_vmag=True))['reason'],'invalid-brightness')
    def test_vmag_string(self):self.assertEqual(self.score(replace(BASE,target_vmag='1'))['reason'],'invalid-brightness')
    def test_vmag_four_allowed(self):self.assertTrue(self.score(replace(BASE,target_vmag=4))['correct'])
    def test_vmag_too_faint(self):self.assertEqual(self.score(replace(BASE,target_vmag=4.01))['reason'],'target-too-faint')
    def test_altitude_boolean(self):self.assertEqual(self.score(replace(BASE,target_altitude_deg=True))['reason'],'invalid-altitude')
    def test_altitude_string(self):self.assertEqual(self.score(replace(BASE,sun_altitude_deg='-20'))['reason'],'invalid-altitude')
if __name__=='__main__':
    suite=unittest.defaultTestLoader.loadTestsFromTestCase(ReferenceTests)
    result=unittest.TextTestRunner(verbosity=1).run(suite)
    report={'scope':'자체 작성한 Python 참조 판정기의 합성 데이터 단위 시험. 실제 앱·센서·렌더러·전천 검증이 아님.',
      'testsRun':result.testsRun,'passed':result.testsRun-len(result.errors)-len(result.failures),'failures':[str(x) for x,e in result.failures],
      'errors':[str(x) for x,e in result.errors],'status':'passed' if result.wasSuccessful() else 'failed'}
    (ROOT/'G5/qa/skypick-reference-tests.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    raise SystemExit(0 if result.wasSuccessful() else 1)
