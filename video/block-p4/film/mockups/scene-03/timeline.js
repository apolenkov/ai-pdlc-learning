tl.addLabel('setup', 0);
tl.set("#p4-mock-03-setup .state", {opacity: 1, x: 0, scale: 1}, 0);

tl.to("#p4-mock-03-setup .state", {opacity: 0, duration: 0.5, ease: 'power2.in'}, 12.9);
tl.addLabel('empty-project', 13.4);
tl.fromTo("#p4-mock-03-empty-project .state", {opacity: 0, x: 32}, {opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', immediateRender: false}, 13.4);

tl.to("#p4-mock-03-empty-project .state", {opacity: 0, duration: 0.5, ease: 'power2.in'}, 26.3);
tl.addLabel('remote', 26.8);
tl.fromTo("#p4-mock-03-remote .state", {opacity: 0, x: 32}, {opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', immediateRender: false}, 26.8);

tl.to("#p4-mock-03-remote .state", {opacity: 0, duration: 0.5, ease: 'power2.in'}, 36.7);
tl.addLabel('first-push', 37.2);
tl.fromTo("#p4-mock-03-first-push .state", {opacity: 0, x: 32}, {opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', immediateRender: false}, 37.2);
tl.set('#p4-mock-03-first-push .command', {opacity: 0}, 37.2); tl.fromTo('#p4-mock-03-first-push .command', {opacity: 0, x: 20}, {opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', immediateRender: false}, 38);
tl.to("#p4-mock-03-first-push .state", {opacity: 0, duration: 0.5, ease: 'power2.in'}, 49.9);
tl.addLabel('clone', 50.4);
tl.fromTo("#p4-mock-03-clone .state", {opacity: 0, x: 32}, {opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', immediateRender: false}, 50.4);

tl.to("#p4-mock-03-clone .state", {opacity: 0, duration: 0.5, ease: 'power2.in'}, 62.7);
tl.addLabel('register', 63.2);
tl.fromTo("#p4-mock-03-register .state", {opacity: 0, x: 32}, {opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', immediateRender: false}, 63.2);

tl.to("#p4-mock-03-register .state", {opacity: 0, duration: 0.5, ease: 'power2.in'}, 72.1);
tl.addLabel('mkdir', 72.6);
tl.fromTo("#p4-mock-03-mkdir .state", {opacity: 0, x: 32}, {opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', immediateRender: false}, 72.6);

tl.to("#p4-mock-03-mkdir .state", {opacity: 0, duration: 0.5, ease: 'power2.in'}, 85.2);
tl.addLabel('config', 85.7);
tl.fromTo("#p4-mock-03-config .state", {opacity: 0, x: 32}, {opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', immediateRender: false}, 85.7);

tl.to("#p4-mock-03-config .state", {opacity: 0, duration: 0.5, ease: 'power2.in'}, 96.3);
tl.addLabel('init', 96.8);
tl.fromTo("#p4-mock-03-init .state", {opacity: 0, x: 32}, {opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', immediateRender: false}, 96.8);

tl.to("#p4-mock-03-init .state", {opacity: 0, duration: 0.5, ease: 'power2.in'}, 111.4);
tl.addLabel('new-change', 111.9);
tl.fromTo("#p4-mock-03-new-change .state", {opacity: 0, x: 32}, {opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', immediateRender: false}, 111.9);

tl.to("#p4-mock-03-new-change .state", {opacity: 0, duration: 0.5, ease: 'power2.in'}, 125.5);
tl.addLabel('branch', 126);
tl.fromTo("#p4-mock-03-branch .state", {opacity: 0, x: 32}, {opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', immediateRender: false}, 126);
tl.set('#p4-mock-03-branch .command', {opacity: 0}, 126); tl.fromTo('#p4-mock-03-branch .command', {opacity: 0, x: 20}, {opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', immediateRender: false}, 126.8);
tl.to("#p4-mock-03-branch .state", {opacity: 0, duration: 0.5, ease: 'power2.in'}, 138.7);
tl.addLabel('stage', 139.2);
tl.fromTo("#p4-mock-03-stage .state", {opacity: 0, x: 32}, {opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', immediateRender: false}, 139.2);
tl.set('#p4-mock-03-stage .command', {opacity: 0}, 139.2); tl.fromTo('#p4-mock-03-stage .command', {opacity: 0, x: 20}, {opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', immediateRender: false}, 140);
tl.to("#p4-mock-03-stage .state", {opacity: 0, duration: 0.5, ease: 'power2.in'}, 151.6);
tl.addLabel('commit', 152.1);
tl.fromTo("#p4-mock-03-commit .state", {opacity: 0, x: 32}, {opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', immediateRender: false}, 152.1);
tl.set('#p4-mock-03-commit .command', {opacity: 0}, 152.1); tl.fromTo('#p4-mock-03-commit .command', {opacity: 0, x: 20}, {opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', immediateRender: false}, 152.9);
tl.to("#p4-mock-03-commit .state", {opacity: 0, duration: 0.5, ease: 'power2.in'}, 164.8);
tl.addLabel('push', 165.3);
tl.fromTo("#p4-mock-03-push .state", {opacity: 0, x: 32}, {opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', immediateRender: false}, 165.3);
tl.set('#p4-mock-03-push .command', {opacity: 0}, 165.3); tl.fromTo('#p4-mock-03-push .command', {opacity: 0, x: 20}, {opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', immediateRender: false}, 166.1);
tl.to("#p4-mock-03-push .state", {opacity: 0, duration: 0.5, ease: 'power2.in'}, 178);
tl.addLabel('merge-request', 178.5);
tl.fromTo("#p4-mock-03-merge-request .state", {opacity: 0, x: 32}, {opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', immediateRender: false}, 178.5);

tl.to("#p4-mock-03-merge-request .state", {opacity: 0, duration: 0.5, ease: 'power2.in'}, 192.1);
tl.addLabel('doctor', 192.6);
tl.fromTo("#p4-mock-03-doctor .state", {opacity: 0, scale: 0.97}, {opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.2)', immediateRender: false}, 192.6);

tl.to("#p4-mock-03-doctor .state", {opacity: 0, duration: 0.5, ease: 'power2.in'}, 206.2);
tl.addLabel('pull-warning', 206.7);
tl.fromTo("#p4-mock-03-pull-warning .state", {opacity: 0, x: 32}, {opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', immediateRender: false}, 206.7);
