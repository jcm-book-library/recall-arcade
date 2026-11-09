# Animals (was Nature & Animals): the new line-up (owner, 9 Nov 2026)

**Decided:** the subject becomes **Animals**, with six quizzes that share similar game mechanics
(to be worked out together). Dinosaurs move out to a later stage of their own.

| New quiz | Comes from | Notes |
|---|---|---|
| Land Animals | today's **Animals** (`ausanimals`) | keep the deck id so saved scores and the challenge tick survive |
| Ocean Animals | new | |
| Bird Life | new | Australian birds are a good starter round |
| Bugs & Insects | new | |
| Pet Breeds | today's **Pet Breeds** (`pets`) | unchanged |
| Baby Animals, Group Names & Classifying Life | today's **Baby Animals & Group Names** (`babies`) and **Classifying Life** (`life`) | one home-page card; both old ids kept (as rounds or linked games) so nothing earned is lost |

**Dinosaurs** (`dinosaurs`): taken off the Animals home page but kept reachable, with its scores,
until its own stage is built. (Ideas for that stage: it could tie in with The Scale of Things'
deep time, Eras & Dynasties, or a "prehistoric" island area.)

## Things to change when this is built
- The subject name in `SUBJECT_NAMES` (src/engine/progress.ts), the home page list (src/ui/home.ts),
  each deck's `subject`, and the island building (src/arcade/island-map.ts, the zoo). Challenges ticked
  under the old name still count, because cleared subjects are worked out from deck ids.
- The island building could become a zoo and aquarium.

## Questions for the owner (to iron out with the shared mechanics)
1. **Shared mechanics:** photo → type the name (like Animals now), name → click the photo (like Pet Breeds),
   multiple choice, and a "Learn it first" photo wall. All of these, or a set per quiz?
2. **Rounds inside each quiz:** by continent or habitat (Australian, African...), by type (sharks, whales, reef fish),
   or by difficulty?
3. **Australian starter rounds** for each quiz (Easy track): yes?
4. **Data:** a sheet tab per quiz (name, also accept, round, Wikipedia title for the photo), filled by Claude and
   marked "please check", like the Entertainment tabs?
