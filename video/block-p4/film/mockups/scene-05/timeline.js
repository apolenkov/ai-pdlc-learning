tl.addLabel('contract', 0);
tl.set("#p4-mock-05-contract .state", {opacity: 1, x: 0, scale: 1}, 0);

tl.to("#p4-mock-05-contract .state", {opacity: 0, duration: 0.5, ease: 'power2.in'}, 18.3);
tl.addLabel('missing-field', 18.8);
tl.fromTo("#p4-mock-05-missing-field .state", {opacity: 0, x: 32}, {opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', immediateRender: false}, 18.8);

tl.to("#p4-mock-05-missing-field .state", {opacity: 0, duration: 0.5, ease: 'power2.in'}, 26.4);
tl.addLabel('planning', 26.9);
tl.fromTo("#p4-mock-05-planning .state", {opacity: 0, x: 32}, {opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', immediateRender: false}, 26.9);

tl.to("#p4-mock-05-planning .state", {opacity: 0, duration: 0.5, ease: 'power2.in'}, 37.2);
tl.addLabel('code', 37.7);
tl.fromTo("#p4-mock-05-code .state", {opacity: 0, x: 32}, {opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', immediateRender: false}, 37.7);

tl.to("#p4-mock-05-code .state", {opacity: 0, duration: 0.5, ease: 'power2.in'}, 52.6);
tl.addLabel('task-status', 53.1);
tl.fromTo("#p4-mock-05-task-status .state", {opacity: 0, x: 32}, {opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', immediateRender: false}, 53.1);

tl.to("#p4-mock-05-task-status .state", {opacity: 0, duration: 0.5, ease: 'power2.in'}, 67);
tl.addLabel('join', 67.5);
tl.fromTo("#p4-mock-05-join .state", {opacity: 0, scale: 0.97}, {opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.2)', immediateRender: false}, 67.5);

tl.to("#p4-mock-05-join .state", {opacity: 0, duration: 0.5, ease: 'power2.in'}, 77.8);
tl.addLabel('archive', 78.3);
tl.fromTo("#p4-mock-05-archive .state", {opacity: 0, scale: 0.97}, {opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.2)', immediateRender: false}, 78.3);

tl.to("#p4-mock-05-archive .state", {opacity: 0, duration: 0.5, ease: 'power2.in'}, 89.2);
tl.addLabel('release', 89.7);
tl.fromTo("#p4-mock-05-release .state", {opacity: 0, x: 32}, {opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', immediateRender: false}, 89.7);
