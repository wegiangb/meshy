var Calculate = (function() {

  var Vector3 = THREE.Vector3;
  var Line = THREE.Line;
  var Plane = THREE.Plane;

  // get an array of the face's vertices in the original winding order
  function _faceVertices(face, vertices, matrix) {
    var va = new Vector3().copy(vertices[face.a]);
    var vb = new Vector3().copy(vertices[face.b]);
    var vc = new Vector3().copy(vertices[face.c]);

    if (matrix !== undefined) {
      va.applyMatrix4(matrix);
      vb.applyMatrix4(matrix);
      vc.applyMatrix4(matrix);
    }

    return [va, vb, vc];
  }

  // calculate face area
  function _faceArea(face, vertices, matrix) {
    var [a, b, c] = _faceVertices(face, vertices, matrix);

    // (b - a) cross (c - a) / 2
    return b.clone().sub(a).cross(c.clone().sub(a)).length() / 2;
  }

  // calculate the volume of an irregular tetrahedron with one vertex at the
  // origin and the given face forming the remaining three vertices
  function _faceVolume(face, vertices, matrix) {
    var [a, b, c] = _faceVertices(face, vertices, matrix);

    var volume = 0;
    volume += (-c.x*b.y*a.z + b.x*c.y*a.z + c.x*a.y*b.z);
    volume += (-a.x*c.y*b.z - b.x*a.y*c.z + a.x*b.y*c.z);

    return volume / 6;
  }

  // center of mass of an irregular tetrahedron with one vertex at the origin
  // and the given face forming the remaining three vertices
  function _faceCenterOfMass(face, vertices, matrix) {
    var [a, b, c] = _faceVertices(face, vertices, matrix);

    return a.add(b).add(c).divideScalar(4);
  }

  // calculate the intersection of a face with an arbitrary plane
  function _planeFaceIntersection(plane, face, vertices, matrix) {
    var [a, b, c] = _faceVertices(face, vertices, matrix);

    // intersection points of the plane with all three face segments; each is
    // undefined if no intersection
    var vab = plane.intersectLine(new Line(a, b));
    var vbc = plane.intersectLine(new Line(b, c));
    var vca = plane.intersectLine(new Line(c, a));

    // if no intersections, return null
    if (vab === undefined && vbc === undefined && vca === undefined) {
      return null;
    }
    // in the anomalous situation that the plane intersects all three segments,
    // two of the intersections have to be coincident, so remove one
    else if (vab !== undefined && vbc !== undefined && vca !== undefined) {
      if (vab.equals(vbc)) vab = undefined;
      else if (vbc.equals(vca)) vbc = undefined;
      else vca = undefined;
    }

    // get the first and second intersections
    var v0 = vab !== undefined ? vab : vbc !== undefined ? vbc : vca;
    var v1 = v0 === vca ? undefined : v0 === vbc ? vca : vbc;

    // if either intersection doesn't exist, return null
    if (v0 === undefined || v1 === undefined) return null;

    return new Line(v0, v1);
  }

  // apply a function to each face
  function _traverseFaces(mesh, callback) {
    var geo = mesh.geometry;
    var faces = geo.faces, vertices = geo.vertices;
    var matrix = mesh.matrix;

    for (var f = 0; f < faces.length; f++) {
      callback(faces[f], vertices, matrix);
    }
  }

  // calculate the surface area of a mesh
  function _surfaceArea(mesh) {
    var area = 0;

    _traverseFaces(mesh, function(face, vertices, matrix) {
      area += _faceArea(face, vertices, matrix);
    });

    return area;
  }

  // calculate the volume of a mesh
  function _volume(mesh) {
    var volume = 0;

    _traverseFaces(mesh, function(face, vertices, matrix) {
      volume += _faceVolume(face, vertices, matrix);
    });

    return volume;
  }

  // calculate the center of mass of a mesh
  function _centerOfMass(mesh) {
    var center = new Vector3();
    var volume = 0;

    _traverseFaces(mesh, function(face, vertices, matrix) {
      var faceVolume = _faceVolume(face, vertices, matrix);
      var faceCenterOfMass = _faceCenterOfMass(face, vertices, matrix);

      // add current face's center of mass, weighted by its volume
      center.add(faceCenterOfMass.multiplyScalar(faceVolume));

      // update volume
      volume += faceVolume;
    });

    // divide by total volume to get center of mass
    return center.divideScalar(volume);
  }

  function _crossSection(plane, mesh) {
    var point = new Vector3();
    plane.coplanarPoint(point);

    var crossSection = 0;

    _traverseFaces(mesh, function(face, vertices, matrix) {
      var segment = _planeFaceIntersection(plane, face, vertices, matrix);

      // nonzero contribution if plane intersects face
      if (segment !== null) {
        // triangle between coplanar point and the two endpoints of the segment
        var pa = new Vector3().subVectors(segment.start, point);
        var pb = new Vector3().subVectors(segment.end, point);

        // compute area of the triangle; possibly force it negative depending on
        // the normal
        var area = Math.abs(pa.cross(pb)) / 2;
        var sign = segment.start.dot(face.normal);

        crossSection += area * sign;
      }
    });

    return crossSection;
  }

  return {
    faceArea: _faceArea,
    surfaceArea: _surfaceArea,
    volume: _volume,
    centerOfMass: _centerOfMass,
    crossSection: _crossSection
  };

})();