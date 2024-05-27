var searchMatcher = function(posts) {

    return function findMatches(q, cb) {
        var matches, substrRegex;

        // an array that will be populated with substring matches
        matches = [];

        var qs = q.split(" ");
        $.each(posts, function(i1, post){
            var include = true;
            $.each(qs, function(i2, term){
                var substrRegex = new RegExp(term, 'i');
                if(!substrRegex.test(post.terms)){
                    include = false;
                }
            });
            if(include) {
                post.query = qs.join(" ");
                matches.push(post);
            }
        });

        cb(matches);
    };
};

var posts = [

    
                { "isPost": false, "url": "/", "title": "thewriteplace<small>.rocks</small>", "terms": "a advice all amidst and at because block blog chaos characters community complete crafting discover dive dodging embrace enjoys every experience few find finding good heart help hopeful humorous in insights into is join journey just know laughs learning let lot make memorable messy misstep mix novelist occasional of offers on or our place practical pro re right s seasoned sense someone story that the thing this tips to together trying turned ve voice we welcome where whether who whole with wonderfully words world write writer writers writing you your thewriteplace<small>.rocks</small>" },
            
                { "isPost": false, "url": "/about/", "title": "About", "terms": "a abilities about accessibility accessible accommodating all allows also an and any are aspiring assets at audiences b be belief blog blogs broaden but by change changes com comes concepts content continually contributes core couldn create creating creative dedication derived design designer develop directly drives easier easy edit engaging enhances enjoyable everyone experiences extensions find flavored for found friendly from game games gaming general generic gfm github great hall has he her high host hosted html icons if images implementation in inclusive inclusivity industry innovations interaction interest into is it its jekyll jekyllfaces jekyllrb joehall joseph journey just keen knowledge kojika landing language latest layout literature little live ll looking make making manage managing markdown more most net not note noun of on only or other out page pages passion plain post power powered practices pre present project projects promote provides push quality quite re ready regardless release repository represent responsible s see seeks she since site skills sometimes special specific spits static staying stories storytelling t templated text than thanks that the their thenounproject they this through to tons tool topic transform underlying updated use uses version visit visitors visual want websites welcoming where with work works world writer wrote you your — About" },
            
                { "isPost": false, "url": "/assets/favicons/", "title": "Your Favicon Package", "terms": "&gt &lt 16 16x16 180x180 32x32 5bbad5 a able access apple assets be browserconfig check checker code color color= config content= example extract favicon favicons ffc40d ffffff file following for generated head href= https ico icon image in insert install instructions joehall link manifest mask meta msapplication name= named net of optional package pages pinned png realfavicongenerator rel= safari section shortcut should site sizes= svg tab the theme this tilecolor to touch type= v0 was webmanifest with xml you your Your Favicon Package" },
            
                { "isPost": false, "url": "/blog-archive.html", "title": "Post Archive", "terms": "&mdash &raquo 1 2024 22 a all and archive are below budding can community enthusiasts favorite for good have in join just listed loves may more new novelist of or our place poet post posts re read readers receive right rocks rss seasoned someone spot story subscribe the thewriteplace things thrilled to via we welcome whether who word write writers writing you your Post Archive" },
            
                { "isPost": false, "url": "/blog.html", "title": "Recent Posts", "terms": "&raquo 2024 22 a all and below budding can community enthusiasts favorite for good have in is join just listed loves may more new novelist of only or our place poet post posts re read readers receive recent right rocks rss seasoned someone spot story subscribe the thewriteplace things thrilled to via we welcome whether who word write writers writing you your Recent Posts" },
            
                { "isPost": false, "url": "/contact-us.html", "title": "", "terms": "at be can info@thewriteplace reached rocks we " },
            
                { "isPost": false, "url": "/content/book/", "title": "{{ page.dir }}", "terms": "book content dir page {{ page.dir }}" },
            
                { "isPost": false, "url": "/content/book/01-adventure-of-sherlock-holmes/01-chapter-01.html", "title": "Part 1 A SCANDAL IN BOHEMIA", "terms": "1 1858 1888—i a abandoned abhorrent able about absolute absolutely absorb accent accomplished account accustomed acquaintance across actions active activity added address addressing adjusted adler admirable admirably admit adopted adventuress advise afternoon again against agent agitation ago akin all almost alone aloud also alternating always am ambition amiss among an and another answered anxiety any anything apiece apparent apparently appearance appeared appears are armchair around as asked associated astrakhan at atkinson attempt attempts attention attitude attracted august authenticity authoritative avenue aware away back bad baffled bag baker balanced bands barbaric be beauties beautiful became because been before begin begins behind being believe bell beryl best betrothal better between beyond binding biography bit black blackmailing blanche blind blue bohemia bohemian book books boot boots born boswell both bought boy briefly brilliantly brimmed bring briony broad brooch brothers brougham brown bulge burglars buried burned business but by cabinet call called calves came can capital carefully careless carelessly carlsbad carried carte case cases cassel caught caused centred centuries certainly certificates chair chamber chamois changed chapter character chat cheekbones chest chin chronicle chuckled cigarette cigars circumstances civil clasped clear clearing client client— cloak clock closing clothes clotilde cloud clues clumsy coat cocaine cold colleague coloured come comes commander committed communicate companion complete completed compromise compromised compromising conceal concerning condescend conduct confess confide consisted construction consult consulting continental continued contraction contralto—hum corner could count country country—in course crack created cried crime crown crusted curb customary cuts daily dark data daughter day days dear death deduce deduction deep deepest deeply delicacy delicate delicately depicted desire desires desirous desperation did difficult discover discretion distinction distracting disturbing diverted do docketing doctor does doing doings don donna door double doublebreasted doubt doubts down dr drawing dreadful dreams dress drifted drop drowsiness drug dryly dubious duke dull during e each eagerly ease easily eclipses edges effusive eglonitz— eglow egria eight either else emotion emotions employing employs end endeavouring energetic energy england english enough entangled entered establishment europe european even ever every exactly exaggerated examined example excuse expenses experiences explain explained extended extending extraordinary extreme eye eyes face factor facts faculties fail failed false familiar families family fancy far fashion feet felstein felt few fierce fifty figure finally find finds finely fire firelight first fishes five flame flaming follow followed following for forefinger forehead forgery form former formerly fortunate found frenchman frequently friend from fronts fur furnish g gasogene gazetteer gentleman german gesture getting gibe gigantic girl give given glad glance glanced glancing glassfactories go gold good gottsreich go—none grand grating great grit ground grow guineas ha habit had half halfway hall hand handed hands hanging happiness hardly harness harsh has hat have he head hear heard heavy hebrew height help hence her hercules here hereditary herself high him himself his history hold holland holmes home honour hoofs hopeless horses hot hour house houses how however how— hum hundred hundreds hurled i if imagine imitate imitated immediately immense impatiently imperial implicates importance impression in inches incidents incisive incognito incorrigible indeed index indicated indiscretion influence information insensibly inside instance instead instrument intended interested interesting interests into introduce introspective intrusions iodoform irene is it its itself jane jersey john journey just keen kindly king kingdom kings knew know known kramm la laid langham languid large last late lately laughed laughing lead leather led left legal length lengths lengthy lenses less let letters light lighting like limbs line lined lip lit little lived living loathed lodge lodgings london london—quite long look looked lost lothman loud lounging love lover lower luggage lying machine made mademoiselle mad—insane majesty make maker malignant man manner many march mark marked marriage married marry mary mask master matter matters may me means medical member memory men meningen mental mention merely mess might mills mind miss mission mistake mistaken moment monday money monogram monograph mood more morrow most motives much mud murder murmured must my myself mysteries mystery name nature neck nervous never new news next nice night night—it nitrate no nobleman none not note notes nothing notice now numerous o observation observe observed observer—excellent observing obstinacy obviously occasionally occupied odessa of official often oh old on once one only open opening opera operatic opulence or order ormstein other our out outside over own p paced pacing packet pair paper papers paragraphs parallel part particularly pass passage passed passing passions past patient paused pay peculiar peculiarly peculiar—that perfect person photograph pink pity placed plainly point police pooh position post pounds power powers practice prague pray precaution precise precisely predominates prefer prefers present press presumably pretty prima prince principles private problem problems process processes proclaimed produce profession progress promise promises pronounce propose prove provinces publicly pull purpose purposes pushed put putting quarter quarters quench question questionable quite rabbi raised rang ransacked rather read readers reasoner reasoning reasons receipt received recent recovered reigning remained remains remarked remembered remove reopened reproachfully resolute resolution resolve result results retired returned returning rich richness ridiculously right rise risen rolled room rooms rose round royal rubbed ruin russian s safely said sandwiched save saw saxe say scala scandal scandinavia scarlet scene scent scored scraped scribbled sea seal seat second secrecy secret secreted secured see seen seized seldom sell send sensitive sent sentence— serious seriously serpentine servant services settling seven seventeen sex shadow shall shared sharp she sheet shelves sherlock shoe should shoulders show showing shown shrugged shutting side sigismond sign signature signs silhouette silk silver simple simplicity since single singular sit sitting six slashed slavey sleeves slitting slow slowly small smelling sneer so society softer sole some someone soon soul sound spare sparkled speak speaking specimen spirit spoke spoken sprang st staff stage—ha stairs stands state stay steel step steps stethoscope stiff still stolen stood story straight strange street strict strikes strong strongly study subject successfully successive such sufficient suggested suggestive suit suits summons sunk sure surprise swiftly system t table take taken tall tap taste tell temperament texture than that the their them then theories theorize there therefore these they thick thing things think thirty this those though thought threatens three threw through throw throwing thrown thursday time times tinted title to together told too took top tops tore tragedy trained travelled trepoff tried trifle trifling trimmed trincomalee triumphant true trust trusted twentieth twice twist two uncertain uncontrollable uncourteous undated under understand unknown until up upon upper us vague veil verbs very vile visit visitor vizard voice volume von walk walks wallenstein want wanted warsaw warsaw—yes was watson waved way waylaid we wear wearing weather wedlock week weight well were wet what wheels when where which while whistled white who whole whom why wife wilhelm will window wishes with without woman women wood wooing word wore work world would woven wrist writes writing written wrote yawn year years yes yet you young your yours yourself ‘co ‘company ‘eg ‘g ‘gesellschaft ‘p ‘papier ‘remarkable ‘t Part 1 A SCANDAL IN BOHEMIA" },
            
                { "isPost": false, "url": "/content/book/01-adventure-of-sherlock-holmes/02-chapter-02.html", "title": "Chapter 2", "terms": "&amp 2 a able about above absolutely accomplice accustomed across action actor acute adler admirably advantage advantages affairs after afterwards again against ah air aisle alarm all almost alone already also altar am amazing amiable among an and animated another answered any anyone anything apart appearance appeared aquiline are arm arms arnsworth arranged arrangements arrest arrived as ashamed asked assisting associated assumed assuring at attempt attempts attend attention avenue averse awaiting away baby bachelor back baggy baker balancing banker be beamed bear beautiful beautifully became becomes bedroom beef been beer before began behind being bell benevolent beside besides best better betterdressed between bijou biographies black blackest blinds blood blow bonnet bore borne bound box brave breaking breathing bride bridegroom bring briony broad broke brought brushed buckles built burgled busier business busy but buttoned by cab cabby cabinet cabman call calls came campaign can cap capable care carriage carried carries carry case castle catch caught cause ceased centre certain chair chambers chance chances change changed chapter character child choked chubb church cigars cigarshaped clapped clear clergyman client clock close closely clothes clouds co coach coachman coat cold come comes comfortable coming compelled complete compunction concealment concerts confidant confined conspiring continue contrary conveyed copper corner costume couch could course creature cried crime crimes crowd crowded cry curiosity curled curve daintiest dark darlington dashed dashing day days dead deal deeply delay delicate delighted departure depended description desire details determined deuce devil did die different difficulties dimly dinner direction directions disappeared discuss disentangled disguises disreputable do doctor does doing don done door double down dozen dragged draw drawn dress dressed drew drive driven driver drives driving dropped drove drunken dusk each ear earnestly earning easy eat edged edgeware eight either elbowed else emerged employed end ended energetic engaged english enough enter entirely equalled equally escaped even evening ever every everyone evidently exalted examined excellent except exchange excitedly excuses expected expostulating expression eyes face faced factor failing fall false fare fast fasteners faster fathom fear features fell fellow felt few field fierce figure figures fills find fine finished fire fists fitted five flirting floor flurried flushed follow followed following food for former formidable forward found four freely freemasonry fresh friend fro from front funny furnished gang garden gave general generally gentleman get girl give glanced glass gleam glimpse glimpses god godfrey goes gold gone good grabs grace grasp great greeting grim grinder groom gross ground group guardianship guardsmen guess guessed guinea habits had hadn half hall hand hands handsome hand—so—you hankey hansom hard hardened hare harness has hat have having he head heads hear heard heart heartily heels help helpless her hesitated him his holmes home hope horses horsey hospital hot hour hours house how however hungrily hurried hurry hurt i idler if ill ill—gentlemen imagine immediate important impulse in incisive inclined increased indeed indirect inextricable inflamed influence informality information informed injured injuring inner inquiry insist instant instinct intention interest interested interfere into intrusted invariable investigation irene is issue it its jewel john join jumped just keen keeping kempt key kindliness king knew knot know knows lady laid lamps landau landlady lane large later latter laughed laughing law lawyer lay lead least leave left legal legs lent less let letter license lie life lighted lights like likely limp listen listened lit little lives ll loafer loafing locality lock lodge long look looked looking lose lost lounged loungers lounging lovely lucky madame made maid maids—joined majesty make making male man manner marm marriage married marry masterly matter matters may me mean measures meet memory men menaced merely methods mews might mind minded mine minutes miss mister mistress moist moment monica more morning most motion motioned moustached— mouth mouths mr mrs much mumbling must my myself mysteries mystery narrowly naturally nature near nearly neat necessitate need neighbourhood neither nerves neutral never new nicely night no nod nonconformist none nor norton not nothing noting now number nurse o object obliged observed occasion occupant occur of off often oh old ominous on once one only open opened operation or orders ordinary ostlers other others our ourselves out outlined over overpowering own paced pacing paid paint pair palm panel park part passage passing past pavement peering people perch perfectly perhaps photograph pictured piteous plan planet plans play playing please pleasure plumber pocket pockets point political poor position possibility post powers practically precious precipitance precisely prepare preposterous presently preventing princess principal private probable probably proceedings prompt protect provided pshaw pull pulled purse putting quarrel quarter quest question quick quiet quietly quite raise rather rattled reach reached reaches really reasoner reasoning received recess recorded red refuse refused regain regent rejoiced rejoin relation rely remain remarkable remarkably remarked remember repeated replaced resolved respectable responded responses returned returns right ringing road rocket role roll room rose rough round row rubbing ruin rumble run running runs rush rushed rushing s safer said sally same sat satisfaction savagely save saved saw say scandal scene science scissors scuffle search searched searching secreting secretive secure see seemed seems seen seized seldom selflighting separated sequel seriously serpentine servant seven several shabbily shabby shag shake shall sharp she sherlock shortly shot should shouted shouting show showed shown shriek side sides signal silence simple simplifies since sings sitting situation six size sliding slim slipping slowly small smart smile smoke smoking so sofa solemnly some someone something soon sooner sort soul sounded sovereign specialist spectacle spectators spinster spoke sprang st stage standing staring started station steaming steel stepped steps sticking sticks still stood stopped stories strange street streets stretched struck struggling study substitution subtle success succinct such suddenly suited superb suppose sure surely surpliced surprise surrounded suspected swiftly sympathetic sympathy system t tags take taken taking talking task tell temple ten than thanking that the their them then there these they thick thing things think thinks this thoroughly those though thought three threw through throw tie time times to tobacco told tomorrow too took top tossed towards transferred tray treachery trick trousers trust turn turned turner tweed twelve twenty twice two twopence tying ulster under understand unexpected unlikely unmarried unpleasantness until unusual up upon uproar us use usual values vanished vary ve very view villa visible visitor visits voice voices vouching wait waited waiting walk walked wall want wanted was watch watchchain watched watching watson waving way waylaid we weapon wear well went were what whatever wheel wheels when whence where whether which while whiskered whispered white who whole whom whose why widened will wind window windows wire wish with within without witness woman women won wonder wonderful wondering word work would yes yet you young your yourself youth ‘and ‘come ‘drive ‘first ‘i ‘thank ‘the ‘what ‘you Chapter 2" },
            
                { "isPost": false, "url": "/content/contributors/", "title": "Contributors", "terms": "2001 2006 2007 2014 2015 2018 25 360 3d 3ds 4 500 @groundh0g @hiive @scottescue @stevenalowe a admits after agencies all also an and andrew android application applications architect architecting architecture aren artistic as at author away ayel band bank basement be been before being bills bonfire book books bootstrap both bunker burnout businesses but by can cartooning college companies company compatibility compiler confirms connected consultant consulting courses creating creations cto currently custom d dabbles data database day decade decisions definitions denies design desktop developer developers developing development device domain driven dropwizard earns education engaging enterprise entitymanager entrepreneur escue ex example experience expert express extending fake fauxcabulary few fiction fields find first flexing for fortune from funny game games gaming github google got governmental groundh0g hall has have he head help him his i ibm in innovative interests into inventor ios is it java jekyll job joe join joined joining joseph just keep keyboard know large latest limited lives living ll located love lover lowe makes manager many may me member microsoft mission mix mobile models more most muscles musician my nearly neither net new nintendo noise nor not notable now of on one open or oracle original other others own pages participant passion passions paying people personal place places preserving principal problems product professional programmer programming progresses project projects published puns quite rails ran real reference released resident rollings ruby s sales science scott secondary see self servicing several similar since sketching slated small software solutions solving some source span spare speaker started steven store studio t talented team technologies technology than that the these this though thoughtworks ticket time to uk understand unknown until uses using variety visual was way web when which while who why wide willing windows with worked working works world writer writing written xbox xna years yet you — Contributors" },
            
                { "isPost": false, "url": "/content/terms.html", "title": "Terms and Conditions of Use", "terms": "1 2 3 4 5 6 7 8 @bennadel a about access accessing accordance accordingly accuracy accurate against agree agreeing all allow an and another any appearing applicable apply appropriate are arising as at attempt authorized automated automatically available be because been before being bound business by changes claim collect collected collecting commercial commitment committed communicate companyname companystate compatible complete compliance concerned concerning conditions conducting confidentiality conflict consent consequential contained contents copy copying copyright could created current customers damage damages data date decompile destroy developed disclaimer disclaims disclose disclosure display do does download downloaded due electronic endorsement engineer ensure errata errors even event expressed extent fair fitness following for format from fulfilling fulfillment further general generated governed governing grant granted has have hereby how however identify if implied imply important in inability incidental include including inclusion individual information infringement intellectual internet interruption is it its jurisdictions knowledge law lawful laws lawyer liability liable license likely limitation limitations link linked links local long loss maintained make makes management mark materials may means merchantability mirror modification modifications modify must necessary negates no non not notations notice notified objective obtain of on one only or orally order other otherwise our out outlines own page particular permission person personal photographic policies policy possession possibility practices principles printed privacy profit prohibited property proprietary protect protected provided provisions public purpose purposes readily reasonable regard regulations relating relevant reliability remove representations representative required responsible restrictions results retain reverse reviewed revise revisions rights risk s safeguards security server shall should site sites software solely some specified state such suppliers technical temporarily terminate terminated terminating termination terms text that the theft then these this those time title to tool trade transfer transitory typographical unauthorized under understand unless up update upon us use used user using version very viewing violate violation warrant warranties was we web well where whether which will with without writing you your Terms and Conditions of Use" },
            
{ "title": "bogus", "terms": "" }

];

$(document).ready(function (){
    $('#txtSearch').typeahead({
            hint: true,
            highlight: true,
            minLength: 1
        },
        {
            // name: 'title',
            display: 'title',
            source: searchMatcher(posts)
        });
    $('#txtSearch').bind('typeahead:select', function(ev, suggestion) {
        console.log('Selection: ' + suggestion.query);
    });
});