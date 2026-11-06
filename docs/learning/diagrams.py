import math, re
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle, Circle, Polygon
INK="#15212a"; ACC="#f0a31a"; BLUE="#3f7fe0"; GREEN="#2d9157"; RED="#cc4136"; MUTED="#586874"; BG="#ffffff"
plt.rcParams.update({"font.family":"DejaVu Sans","font.size":12})
def save(fig,name): fig.savefig(name,dpi=150,bbox_inches="tight",facecolor=BG); plt.close(fig)

# 1. The game loop
fig,ax=plt.subplots(figsize=(7,6)); ax.set_xlim(-3.2,3.2); ax.set_ylim(-3,3.2); ax.axis("off")
pts=[(0,2.1,"1. READ INPUT","Which keys are held?\nWhere is the finger?",BLUE),(1.9,-1.2,"2. UPDATE","Move everything a tiny bit.\nCheck for bumps.",GREEN),(-1.9,-1.2,"3. DRAW","Paint the whole picture\nfrom scratch.",ACC)]
for x,y,t,s,c in pts:
    ax.add_patch(FancyBboxPatch((x-1.15,y-0.55),2.3,1.1,boxstyle="round,pad=0.05",fc=c,ec=INK,lw=2,alpha=.9))
    ax.text(x,y+0.2,t,ha="center",va="center",fontsize=13,weight="bold",color="white")
    ax.text(x,y-0.22,s,ha="center",va="center",fontsize=9,color="white")
for (a,b) in [(0,1),(1,2),(2,0)]:
    x1,y1=pts[a][:2]; x2,y2=pts[b][:2]
    ax.add_patch(FancyArrowPatch((x1+(x2-x1)*.33,y1+(y2-y1)*.33),(x1+(x2-x1)*.67,y1+(y2-y1)*.67),arrowstyle="-|>",mutation_scale=25,lw=3,color=INK,connectionstyle="arc3,rad=-0.25"))
ax.text(0,-0.1,"THE GAME LOOP\nround and round,\nabout 120 times\na second",ha="center",va="center",fontsize=12,weight="bold",color=INK)
ax.text(0,-2.6,"Fast enough, and the pictures blur into movement, like a flip-book.",ha="center",fontsize=10,color=MUTED)
save(fig,"d01-loop.png")

# 2. Fixed timestep
fig,ax=plt.subplots(figsize=(9,3.4)); ax.set_xlim(0,10); ax.set_ylim(0,4); ax.axis("off")
ax.text(0,3.6,"Fast screen (120 pictures a second)",fontsize=10,weight="bold"); ax.text(0,1.6,"Slow screen (60 pictures a second)",fontsize=10,weight="bold")
for i in range(12): ax.add_patch(Rectangle((i*0.8,2.6),0.7,0.7,fc=GREEN,ec=INK)); ax.text(i*0.8+0.35,2.95,"1",ha="center",va="center",color="white",fontsize=9)
for i in range(6):
    ax.add_patch(Rectangle((i*1.6,0.6),1.5,0.7,fc=BLUE,ec=INK)); ax.text(i*1.6+0.75,0.95,"2 steps",ha="center",va="center",color="white",fontsize=9)
ax.text(9.8,2.95,"= same\ndistance",va="center",fontsize=9); ax.text(9.8,0.95,"= same\ndistance",va="center",fontsize=9)
ax.text(5,0.1,"Time is cut into equal 1/120-second slices. A slow screen just runs two slices per picture, so the game runs at the same speed everywhere.",ha="center",fontsize=8.5,color=MUTED)
save(fig,"d02-timestep.png")

# 3. Letters -> pixel art (hero)
src=open("/home/user/recall-arcade/src/arcade/hero-art.ts").read()
pal=dict(re.findall(r'(\w): "(#[0-9a-fA-F]{6})"',src[src.index("HERO_PALETTE"):src.index("HERO_PALETTE")+400]))
def rows(name):
    blk=src[src.index("const "+name):]; blk=blk[:blk.index("];")]; return re.findall(r'"([^"]+)"',blk)
legs=re.findall(r'"([^"]+)"',src[src.index("HERO_LEGS_FRONT"):src.index("HERO_LEGS_SIDE")])[:4]
grid=rows("HERO_FRONT")+legs
fig,(a1,a2)=plt.subplots(1,2,figsize=(10,5.4))
for a in (a1,a2): a.set_xlim(0,16); a.set_ylim(16,0); a.set_aspect("equal"); a.axis("off")
for y,r in enumerate(grid):
    for x,ch in enumerate(r):
        a1.text(x+.5,y+.5,ch,ha="center",va="center",fontsize=9,family="monospace",color=INK if ch!="." else "#c0c8cf")
        if ch in pal: a2.add_patch(Rectangle((x,y),1,1,fc=pal[ch],ec=pal[ch]))
a1.set_title("What the code says\n(rows of letters)",fontsize=12,weight="bold"); a2.set_title("What you see\n(each letter = one coloured pixel)",fontsize=12,weight="bold")
fig.text(0.5,0.02,"o = outline · h = hair · s = skin · e = eyes · t = shirt · b = belt · l = trousers · k = shoes · . = see-through",ha="center",fontsize=9,color=MUTED)
save(fig,"d03-letters.png")

# 4. Grid vs smooth movement
fig,(a1,a2)=plt.subplots(1,2,figsize=(10,4))
for a in (a1,a2): a.set_xlim(0,6); a.set_ylim(0,3); a.set_aspect("equal"); a.axis("off")
for x in range(7): a1.plot([x,x],[0,3],color="#d0d7dc",lw=1)
for y in range(4): a1.plot([0,6],[y,y],color="#d0d7dc",lw=1)
for i,x in enumerate([0.5,1.5,2.5,3.5]): a1.add_patch(Circle((x,1.5),0.32,fc=GREEN,alpha=0.25+0.25*i,ec=INK))
for x in [1,2,3]: a1.annotate("",(x+0.3,1.5),(x-0.3,1.5),arrowprops=dict(arrowstyle="-|>",lw=2))
a1.set_title("The Labyrinth: GRID movement\nhop tile to tile (with a smooth slide)",fontsize=11,weight="bold")
xs=[0.3+i*0.25 for i in range(22)]; ys=[1.4+0.9*math.sin(i/3.4) for i in range(22)]
a2.plot(xs,ys,color=BLUE,lw=3); a2.add_patch(Circle((xs[-1],ys[-1]),0.25,fc=BLUE,ec=INK))
a2.set_title("Flyover: SMOOTH movement\nspeed builds up and dies away",fontsize=11,weight="bold")
save(fig,"d04-movement.png")

# 5. Hitbox vs picture
fig,ax=plt.subplots(figsize=(8,3.6)); ax.set_xlim(0,10); ax.set_ylim(0,4); ax.set_aspect("equal"); ax.axis("off")
cloud=[(1.4,2.2,.8),(2.3,2.5,1.0),(3.3,2.2,.8),(2.2,1.8,.8)]
for x,y,r in cloud: ax.add_patch(Circle((x,y),r,fc="#5b6170",ec="none"))
ax.add_patch(Rectangle((0.6,1.0),3.6,2.4,fill=False,ec=MUTED,ls="--",lw=2)); ax.text(2.4,3.6,"the picture",ha="center",color=MUTED,fontsize=10)
ax.add_patch(Rectangle((1.2,1.5),2.4,1.4,fill=False,ec=RED,lw=3)); ax.text(2.4,0.6,"the hitbox (what really counts)",ha="center",color=RED,fontsize=10,weight="bold")
ax.text(6.9,2.2,"Clouds, birds and planes have soft,\nempty edges. If the whole picture\ncounted, you'd be 'hit' by thin air.\nA smaller box makes near-misses\nfeel fair, the trick arcade games\nhave used since the 1980s.",fontsize=10,va="center",ha="center")
save(fig,"d05-hitbox.png")

# 6. Parallax
fig,ax=plt.subplots(figsize=(9,3.8)); ax.set_xlim(0,10); ax.set_ylim(0,5); ax.axis("off")
ax.add_patch(Rectangle((0,0),10,5,fc="#bfe0f7"))
ax.fill_between([0,2,3.5,5,6.5,8,10],[2.4,3.6,2.8,3.9,2.7,3.5,2.6],0,color="#9fb4cc")
ax.fill_between([0,1.5,3,4.5,6,7.5,9,10],[1.6,2.4,1.9,2.6,1.7,2.5,1.8,2.1],0,color="#5f9e55")
ax.add_patch(Rectangle((0,0),10,0.9,fc="#3d6e3a"))
for y,t,s in [(4.3,"far mountains","slide slowly"),(2.2,"near hills","slide faster"),(0.45,"the ground","slides fastest")]:
    ax.text(10.1,y,f"{t}: {s}",va="center",fontsize=10)
    ax.annotate("",(9.6,y),(9.6+0.001,y),arrowprops=dict(arrowstyle="-"))
ax.annotate("",(6.2,4.3),(7.0,4.3),arrowprops=dict(arrowstyle="-|>",lw=1.5)); ax.annotate("",(5.2,2.2),(7.0,2.2),arrowprops=dict(arrowstyle="-|>",lw=2.5)); ax.annotate("",(3.8,0.45),(7.0,0.45),arrowprops=dict(arrowstyle="-|>",lw=3.5,color="white"))
ax.text(5,5.15,"PARALLAX: layers move at different speeds, so a flat picture feels deep",ha="center",fontsize=11,weight="bold")
save(fig,"d06-parallax.png")

# 7. Pong bounce angle
fig,ax=plt.subplots(figsize=(8,4.5)); ax.set_xlim(0,10); ax.set_ylim(-3,3); ax.set_aspect("equal"); ax.axis("off")
ax.add_patch(Rectangle((0.6,-1.6),0.35,3.2,fc=ACC,ec=INK)); ax.add_patch(Rectangle((0.6,1.0),0.35,0.6,fc="#ffe08a",ec=INK)); ax.add_patch(Rectangle((0.6,-1.6),0.35,0.6,fc="#ffe08a",ec=INK))
for hit,ang,c,lab in [(1.3,50,RED,"hit the edge: steep"),(0.6,25,ACC,"in between"),(0,0,GREEN,"hit the middle: straight")]:
    x2=0.95+6*math.cos(math.radians(ang)); y2=hit+6*math.sin(math.radians(ang))*0.55
    ax.annotate("",(x2,min(y2,2.8)),(0.95,hit),arrowprops=dict(arrowstyle="-|>",lw=2.5,color=c)); ax.text(x2+0.1,min(y2,2.8),lab,fontsize=10,color=c,va="center")
ax.text(5,-2.6,"Where the ball meets the paddle sets its new angle (up to 55°). The brighter ends of the paddle show where the steep shots come from.",ha="center",fontsize=9,color=MUTED,wrap=True)
save(fig,"d07-bounce.png")

# 8. Flood fill checker
maze=["#########","#P..#...#","#.#.#.#.#","#.#...#E#","#.#####.#","#.......#","#########"]
fig,axs=plt.subplots(1,3,figsize=(11,3.6))
dist={}; from collections import deque
q=deque(); 
for y,r in enumerate(maze):
    for x,ch in enumerate(r):
        if ch=="P": q.append((x,y)); dist[(x,y)]=0
while q:
    x,y=q.popleft()
    for dx,dy in((1,0),(-1,0),(0,1),(0,-1)):
        n=(x+dx,y+dy)
        if maze[n[1]][n[0]]!="#" and n not in dist: dist[n]=dist[(x,y)]+1; q.append(n)
for a,lim,t in zip(axs,[2,7,99],["Start: colour the start","...then every square next to a coloured one...","...until nothing new can be reached"]):
    a.set_xlim(0,9); a.set_ylim(7,0); a.set_aspect("equal"); a.axis("off"); a.set_title(t,fontsize=10)
    for y,r in enumerate(maze):
        for x,ch in enumerate(r):
            fc="#3b4250" if ch=="#" else ("#a8e6b8" if dist.get((x,y),999)<=lim else "#eef1f3")
            a.add_patch(Rectangle((x,y),1,1,fc=fc,ec="#cfd6db"))
            if ch in "PE": a.text(x+.5,y+.5,ch,ha="center",va="center",weight="bold")
fig.text(0.5,0.0,"If the exit E ends up coloured, the level can be finished. The checker scripts do this on every map, every time a map changes.",ha="center",fontsize=9,color=MUTED)
save(fig,"d08-floodfill.png")

# 9. Telegraph timeline + sine hazard
fig,(a1,a2)=plt.subplots(2,1,figsize=(9,5))
a1.set_xlim(0,10); a1.set_ylim(0,1.5); a1.axis("off")
for x0,w,c,l in [(0,2.6,"#c9d3da","quiet"),(2.6,0.9,ACC,"warning light\n0.9 s"),(3.5,0.4,RED,"zap\n0.4 s"),(3.9,2.6,"#c9d3da","quiet"),(6.5,0.9,ACC,"warning"),(7.4,0.4,RED,"zap"),(7.8,2.2,"#c9d3da","quiet")]:
    a1.add_patch(Rectangle((x0,0.4),w,0.6,fc=c,ec=INK)); a1.text(x0+w/2,0.7,l,ha="center",va="center",fontsize=8)
a1.set_title("TELEGRAPHING: a fair warning before every danger (thundercloud)",fontsize=11,weight="bold")
xs=[i/20 for i in range(201)]; a2.plot(xs,[math.sin(x*1.1) for x in xs],color=BLUE,lw=3); a2.set_xlim(0,10); a2.axis("off")
a2.set_title("A SINE WAVE: the smooth up-and-down path of the news helicopter",fontsize=11,weight="bold")
save(fig,"d09-telegraph-sine.png")

# 10. Process flow
steps=[("Your idea\n& play-test notes",ACC),("Design note\n(docs/)",BLUE),("Written brief\nfor a helper",BLUE),("Helper builds\n+ tests",GREEN),("Lead reviews,\nplays, fixes",GREEN),("Pull request",MUTED),("You merge",ACC),("Live site\nupdates",RED)]
fig,ax=plt.subplots(figsize=(11,2.6)); ax.set_xlim(0,len(steps)*1.4); ax.set_ylim(0,1.6); ax.axis("off")
for i,(t,c) in enumerate(steps):
    ax.add_patch(FancyBboxPatch((i*1.4+0.05,0.35),1.15,0.9,boxstyle="round,pad=0.03",fc=c,ec=INK)); ax.text(i*1.4+0.62,0.8,t,ha="center",va="center",color="white",fontsize=8.5,weight="bold")
    if i<len(steps)-1: ax.annotate("",(i*1.4+1.43,0.8),(i*1.4+1.22,0.8),arrowprops=dict(arrowstyle="-|>",lw=2))
save(fig,"d10-process.png")
print("ok")
